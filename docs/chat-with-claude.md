> on store.ts
> I was wrong to suggest splitting `store.ts`. Your instinct is sound: Solid's reactivity is per property, so one big store costs nothing in re-renders, and a single place to read and write state is a real ergonomic gain.

You're also right about the refactor. It merged the _files_, not the _stores_. `store.ts` still has six separate `createStore` calls: `store`, `navStore`, `playerStore`, `queueStore`, `searchStore` and `listStore`. That's one file holding six stores, which is still the same fragmentation.

A true single store would look like this:

```ts
export const [store, setStore] = createStore({
  // app-level (today's `store`, kept at the root)
  api: import.meta.env.DEV ? "" : "https://api.ytify.workers.dev",
  useSaavn: true,
  locale: initLocale,
  translations: {} as Record<TranslationKeys, string> | {},
  libraryUpdated: 0,
  snackbar: undefined as string | undefined,
  syncState: undefined as SyncState | undefined,
  actionsMenu: undefined as (TrackItem & { albumId?: string }) | undefined,
  updater: undefined as (() => void) | undefined,

  nav: { active: "search" as MainFeature, player: {...}, queue: {...}, /* ... */ },
  player: createPlayerInitialState(),
  queue: { list: [] as TrackItem[], history: [] as TrackItem[], removeMode: false, isLoading: false },
  search: createSearchInitialState(),
  list: createListInitialState(),
});
```

Call sites then rewrite mechanically:

| Now                                      | After                                        |
| ---------------------------------------- | -------------------------------------------- |
| `playerStore.volume`                     | `store.player.volume`                        |
| `setPlayerStore("volume", v)`            | `setStore("player", "volume", v)`            |
| `queueStore.list`                        | `store.queue.list`                           |
| `setNavStore("active", "list")`          | `setStore("nav", "active", "list")`          |
| `setListStore(createListInitialState())` | `setStore("list", createListInitialState())` |

The namespaces are there because the stores collide otherwise. `queueStore.list` and `listStore.list` would clash at the root. `store.api` and `store.snackbar` stay as they are.

Some things to check:

- **Put the single `createStore` at the very top.** Right now `playNext` uses `queueStore`, which is declared far below it. That only works because the access is deferred, and one store at the top removes that ordering trap.
- **DOM objects are fine inside a store.** Solid only wraps plain objects and arrays, so `HTMLAudioElement`, `IntersectionObserver` and `AbortController` stay raw. Nothing about them changes.
- **`config` and `drawer` live in `@config`.** They're probably persisted to localStorage, which is a good reason to leave them separate. If they aren't persisted, they could move under `store.config` and `store.drawer` too. Do you want that?
- **The logic in `store.ts` can stay in the same file.** That's the coupling you said you wanted. Navigation, playback events, queue operations, search and list fetching all read and write the same state, so keeping them together is defensible.

I can't see your other files, so the call sites are the risky part. I can write the merged `store.ts` from what you pasted, plus a codemod script (ts-morph or a regex pass) to rewrite every `*Store` / `set*Store` usage across `src/`. Tell me if you want one or both. If you want the codemod, check that your alias imports are always `@stores`, because that's what it keys on.

> on config.ts
> The config file is solid on safety (validation, legacy cleanup, a persisted-state loader). Its main problem is that it fights Solid's reactivity, and that ties into your single-store idea.

**1. `config` is a plain mutable object, so nothing reacts to it.** `config.theme = x` triggers no updates. To work around that, three values were pulled out into separate signals: `librarySections`, `cachingMode` and `playerBackground`. Each now exists twice, once in `config` and once as a signal, and they can drift apart:

- `setPlayerBackground` and `setLibrarySection` update both, which is fine.
- `setCachingModeSignal` is exported raw and doesn't touch `config.cachingMode`. Unless every caller sets both, they'll disagree.

Making `config` a store solves the whole category. Every setting becomes reactive, the three signals disappear, and `config` becomes `store.config` in your single store. `drawer` is the same case and becomes `store.drawer`.

**2. Persistence can be one effect instead of manual `lsSetJSON` calls.**

```ts
createRoot(() => {
  createEffect(() => lsSetJSON("config", store.config));
  createEffect(() => lsSetJSON("drawer", store.drawer));
});
```

This works if `lsSetJSON` stringifies the object, because reading every property inside an effect tracks them all. `setConfig` becomes a one-line wrapper over `setStore("config", key, val)`, so your existing call sites don't change.

**3. Dead code.** In the config loader, `key !== ("cacheLimit" as keyof AppConfig)` can never be false, because `Object.keys(config)` doesn't include `cacheLimit`. Delete it. The `frequentlyPlayed` / `gallery` / `libraryPlays` removals are real migrations, so group them in one `migrate(saved)` function that runs before merging.

**4. Types and arrays are written twice.** Derive the type from the array so they can't go out of sync:

```ts
const CACHING_MODES = ["auto", "on-demand", "off"] as const;
export type CachingMode = (typeof CACHING_MODES)[number];
```

The same applies to `PLAYER_BACKGROUNDS`.

**5. Validation covers only three fields.** `quality`, `theme`, `sortBy`, `sortOrder` and `panelRatio` have the same stale-value risk. A small table of allowed values per key, checked in one loop, replaces the three hand-written `if`s.

**6. Several settings are stringly typed.** `volume: "100"` is parsed with `parseFloat(...)` and written back with `.toString()`, and `watchMode: ""` is used as a boolean through `Boolean(config.watchMode)`. A number and a boolean would be cleaner. But this changes what's saved in users' localStorage, so it needs a migration line. I'd do it last, and only if it bothers you.

**7. Small things.** `export let config` and `export let drawer` should be `const`, since you only mutate them. Also, `setVolume` calls `setConfig`, which serializes the whole config on every slider step. Debounce it, or the single persistence effect above will batch it for you.

If you merge config into the store, the `store.ts` structure becomes:

```ts
export const [store, setStore] = createStore({
  /* app-level fields */
  config: loadConfig(),   // validated + migrated
  drawer: loadDrawer(),
  nav: {...}, player: {...}, queue: {...}, search: {...}, list: {...},
});
```

I'd merge them. Everything stays reactive and in one place, and you keep the single-store experience you wanted. The one cost is that the file grows. If you'd like, I can write the full merged `store.ts` with config and drawer included. I'd do that in one pass, since the call-site rewrites overlap.

You're not ignorant, but localStorage isn't the cause. The cause is that Solid only tracks reads of signals and stores, and a plain object isn't either. Writing `config.theme = x` changes the value and Solid never hears about it, whether or not you save it anywhere.

localStorage is a separate concern. The pattern is usually:

1. Load: read from localStorage once at startup and use it as the initial state.
2. Keep: hold that state in a signal or store, which is what makes it reactive.
3. Save: write back to localStorage when it changes.

Your file does steps 1 and 3 and skips step 2 for most fields. That's why three of them got their own signals. You wanted reactivity and added it one field at a time.

There are real reasons a plain object is tempting for this:

- It's the simplest thing to load, mutate and `JSON.stringify`.
- It can be read anywhere, including in non-component code, without thinking about tracking.
- Settings rarely change, so most code only reads them once and doesn't need to react.

That third reason is why it mostly works. It stops working when the UI has to update immediately after a change, and you've already hit that with the three signal workarounds.

The fix keeps your persistence and adds the missing step:

```ts
const [config, setConfig] = createStore(loadConfig()); // step 1 + 2

createRoot(() => {
  createEffect(() => lsSetJSON("config", config)); // step 3
});
```

Reading `config.theme` in a component or effect now tracks it, and reading it in plain code like `config.volume` still works. A store only gets wrapped in a Proxy. `JSON.stringify(config)` serializes it normally, so `lsSetJSON` needs no changes.

One check: if `lsSetJSON` stringifies inside the effect, every property is read, so the effect tracks all of them and saves on any change. If it only stores a reference without reading properties, the effect would never re-run. Use `JSON.stringify` or `unwrap` inside the effect to make sure.

> on src/utils.ts
> It's a good utilities file. The functions are small and pure, the comments say _why_, and the localStorage helpers are a proper guarded boundary. I wouldn't split it up, since at this size one file is fine and you said you don't want separation for its own sake. Here's what I'd fix, most important first.

1. **`shuffle` mutates its input and returns it, while `reorderItem` and `sortCollection` copy.** Nothing breaks today, because every call site in `store.ts` passes a fresh array. But if someone passes a store array, it will mutate the proxy in place. Make it copy:

   ```ts
   export function shuffle<T>(array: T[]): T[] {
     const a = [...array];
     for (let i = a.length - 1; i > 0; i--) {
       const j = Math.floor(Math.random() * (i + 1));
       [a[i], a[j]] = [a[j], a[i]];
     }
     return a;
   }
   ```

2. **`parseDuration` returns `NaN` on non-numeric input.** Something like `"LIVE"` gives `NaN`, and `NaN < durationLimit` is `false`. So when a duration filter is on, those items are silently dropped. Decide whether that's intended and return `0` or `Infinity` explicitly. The single-part case (`"5"` means 5 minutes) is also odd, so a short comment would help.

3. **`SortBy` is defined twice.** The same union is written inline in `config.ts`. Define it in `utils.ts` and import it there. This causes no cycle, since `config.ts` already imports from `utils`.

4. **`(track as any).img` in `rankFavoriteArtists`.** Add `img?` to the `TrackItem` type and drop the cast.

5. **`convertSStoHHMMSS` returns the English string `"Emergency Mode"`.** You have an i18n system, so this bypasses it. Return something neutral (or `""`) and let the caller translate. `padStart(2, "0")` would also replace the manual padding.

6. **`hostResolver` is the hardest function to read.** With the default argument, `host` is always `location.origin`, so `isInternal` is always `true`. `includes` is a loose check, and `pathModifier` assumes the URL is shaped like `/x=y` or `/a/b`. I haven't seen its callers. If URLs only come from a few shapes, parse them with `new URL()` and handle those shapes explicitly.

7. **`idFromURL` reads match group `[7]`.** That's fragile if the regex changes, so use a named group. It also doesn't match `/shorts/` or `/live/` links. I haven't run it, so test those.

8. **`hasLS()` runs outside any try block.** In some browsers with storage blocked, merely _touching_ `localStorage` throws. Put it in a try/catch. The same applies to `JSON.stringify` inside `lsSetJSON`, which runs before the guarded write.

9. **`generateImageUrl` repeats the `res === "mq" ? "180" : ...` logic three times and hardcodes `wsrv.nl`.** Compute the size once, and move the proxy host to config. The `maxresdefault` check is also duplicated in `pickImage`, so give it one helper.

`rankFavoriteArtists`, the author helpers and `sortCollection` are library domain logic. I'd leave them here if you like the coupling, but `rankFavoriteArtists` with its decay constant is the one I'd move next to `library.ts`.

One question that affects the rest: do you have `typeof location !== "undefined"` guards because something runs outside a browser? `store.ts` has dozens of them too. If `backend/` imports `utils.ts`, that explains them, and it's a reason to keep `utils` DOM-free. If nothing imports them outside the browser, you can delete most of those guards and the code gets much cleaner.

I can write the patched `utils.ts` with items 1-9 applied.

> on backend/utils.ts
> Yes, a common file makes sense here, and it's a split with a real reason. The client utils touch `localStorage` and the DOM, and the backend imports `youtubei.js`. Neither side should pull in the other's dependencies, and a pure `common.ts` sits between them. Possibly that's also why `store.ts` is full of `typeof location` guards: if anything client-side is loaded through `ssrLoadModule` in dev, it runs in Node. I haven't seen the backend's imports, so that's a guess.

**What's duplicated or tied together between the two files:**

| Function                                | Status                                                                                                                                                                                   |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `unique`, `stripTopic`                  | Identical                                                                                                                                                                                |
| `convertSStoHHMMSS`                     | Same job, different edge cases. Backend returns `"00:00"` for negative or non-finite input. Frontend returns `""` for negative and `"Emergency Mode"` for `Infinity`.                    |
| `formatTopicAuthor` / `withTopicSuffix` | Same job, different edges. Backend gives `"Unknown"` for empty input and is case-sensitive. Frontend gives `""` and uses a case-insensitive regex.                                       |
| Duration parsing                        | The frontend has `parseDuration`. `getLockupMeta` re-implements it inline.                                                                                                               |
| Thumbnail ID format                     | The backend's `formatThumbnailId` produces the IDs and the frontend's `generateImageUrl` consumes them. The 11-character regex and the `maxresdefault` check are written in both places. |
| `getShardName`                          | The comment says it matches the dataset partitioning. If the client ever fetches shards directly, it needs the same function.                                                            |

The thumbnail ID row matters most. That format is a contract between two files, and today nothing enforces it.

**What goes in `common.ts`:** pure functions with no imports from the DOM, `youtubei.js` or `localStorage`:

```ts
export const unique = <T>(a: T[]): T[] => [...new Set(a)];

export const VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/;
export const isVideoId = (s: string) => VIDEO_ID.test(s);
export const isMaxRes = (s: string) => s.includes("maxresdefault");

export function parseDuration(d: string): number {
  /* return 0 if NaN */
}
export function convertSStoHHMMSS(s: number): string {
  /* backend's version */
}

export const isTopicAuthor,
  stripTopic,
  withTopicSuffix,
  normalizeText,
  normalizeAuthorKey; // as-is
export function getShardName(id?: string): string {
  /* as-is */
}
```

On the merges:

- For `convertSStoHHMMSS`, keep the backend's behavior and have the frontend handle `Infinity` at the one call site.
- For topic authors, keep the frontend's `withTopicSuffix`. The backend call becomes `withTopicSuffix(name) || "Unknown"`.
- Use the shared `parseDuration` inside `getLockupMeta`.

**After the split:**

- `common.ts` holds the shared pure functions.
- Client `utils.ts` keeps `lsGet*`, `downloadJSON`, `generateImageUrl` and the sort helpers.
- Rename the backend `utils.ts` to something like `innertube.ts`, since it's mostly `youtubei.js` mapping. That also removes the name clash with `src/utils.ts`.

Backend files should import `common` with a relative path. Your `@utils` alias lives in `vite.config`, and a Worker built by wrangler may not see it, so check your tsconfig `paths`.

**Bugs I noticed in the backend file:**

1. **The year fallback never matches.** In `listMapper`, `/^\\d{4}$/` is written with a double backslash, so it matches a literal `\` followed by `dddd`. It should be `/^\d{4}$/`. Only `item.year` works today. Check it isn't a paste artifact.
2. **`getThumbnail` sorts its argument in place** with `.sort`, which mutates the caller's array. It only needs the widest one, so use `thumbnails.reduce(...)` or `[...thumbnails].sort(...)`.
3. **`getLockupMeta` produces "1 views".** The `split("view")[0] + " views"` logic doesn't handle the singular.
4. **The `MusicResponsiveListItem` branch in `streamMapper` is about 100 lines of nested fallbacks** (artists, authors, author, flex runs, menu). It's the one place where I'd extract small helpers (`extractArtist`, `extractAlbum`), because those fallback chains are where regressions will hide. The rest of the mapper functions are fine as long functions.

I can write `common.ts` and the updated imports for both sides. If I do, I'd rather have the files that import from `utils.ts`, so I can check which functions the client actually uses.

> on index.tsx and worker.ts
> Both files are readable and mostly well-guarded. There are real bugs in each, and one thing in the worker I'd look at first.

## `index.tsx`

1. **Shortcuts ignore modifier keys.** `Ctrl/Cmd+1`, `Ctrl+M` and similar get `preventDefault()`ed, which can block browser shortcuts. Add an early return if `e.ctrlKey || e.metaKey || e.altKey`.
2. **Space and the arrow keys are hijacked even when a button or link has focus.** The guard only excludes inputs, textareas, selects and dialogs. If a keyboard user tabs to a button and presses Space, it toggles playback instead of activating the button. Also skip `BUTTON`, `A` and `[role=button]` targets, or only act when the target is `body`.
3. **The `if/else` chain is a keymap in disguise.** A table keeps it declarative, and the `[`, `]` and Shift+N/P aliases become one-line entries:
   ```ts
   const keys: Record<string, () => void> = {
     " ": togglePlay,
     "]": playNext,
     "[": playPrev,
     m: toggleMute,
     "1": () => handleNavClick("queue") /* ... */,
   };
   ```
4. **`<Match when={navStore.active === "search" || true}>`** is a fallback written as a match. Use `<Switch fallback={<Search />}>` and drop that `Match`.
5. **The orientation media query is created twice**, once for the signal's initial value and once in `onMount`. Create it once at module level and share it.
6. **`updateLang().then(render)` has no `.catch`.** If the locale import fails, the screen stays blank. Render with the English fallback in the catch.
7. **Components in a store.** `navStore.queue.component` and the other entries keep a component registry inside reactive state, and you read them non-reactively here. A plain object in `index.tsx` (`const views = { queue: lazy(...), ... }`) is simpler and removes the lazy imports from `store.ts`, which currently imports the features that import the store. That's the one place in the store file where I'd say state and UI are mixed.
8. **Minor:** `import("@modules/start.ts")` is the only import with an extension.

## `worker.ts`

1. **`featured` is handled twice.** The early `if (path === "featured")` block returns in every case, so the `case "featured"` in the switch is dead. Delete it.
2. **Edge caching only works for `featured`.** Only `jsonCachedResponse` calls `edgeCache.put`. Every route in the switch builds its own `Response`, so the lookup at the top finds nothing for them. If you intended caching for search, album and the rest, route them all through that helper.
3. **Missing parameters return 500.** `throw new Error("Missing id parameter")` ends up in the catch block and becomes a 500. Throw an `HttpError(400, ...)` and map it in the catch.
4. **The same `new Response(JSON.stringify(...), { status, headers: { ...corsHeaders, "Content-Type": ... } })` appears about 15 times.** Two helpers, `json(data, status, cache?)` and `text(msg, status)`, would cut roughly 100 lines.
5. **Add `Vary: Origin`.** Responses echo the request's origin in `Access-Control-Allow-Origin`, and without `Vary` a shared cache can serve one origin's header to another.
6. **The sync route regex has issues.** `([a-fA-F0-9]{64}|[a-zA-Z0-9_-]+)` is redundant, because the second alternative already matches the first. It also isn't anchored, so `/sync/abc/anything` matches. Use `^(sync|library)\/([\w-]+)(\/|$)`.
7. **Some inputs are unbounded.** `songdata` ids, `subfeed` channel ids and the `similar` limit are passed through unchecked. A request with 10,000 ids can create expensive upstream calls, so cap them like you already do for `featured`.
8. **Error text is sent to clients.** Both `error.message` and `details: errMsg` go straight into responses. That's useful in development, but upstream messages can leak internals in production.

**Security check on sync (I haven't seen `UserSyncDO.ts`, so check there too).** The "hash" is SHA-256 of `email|password`, unsalted and unstretched. The same hash is both the account identifier and the URL you call (`/sync/<hash>`). If the DO doesn't check anything else (for example via `INTERNAL_TOKEN` or `x-ytify-token`), the only protection is that an attacker can't guess a hash. There's also no rate limit visible in this file, so weak passwords could be guessed online. Also, every sign-up sends the user's email address to `rapid-email-verifier.fly.dev`, which should be in your privacy notes. If sync accounts matter to you, I'd look at this before any refactoring.

## Structure

`localAdapter.ts` presumably duplicates this routing for the dev server. If so, extract one `handleRequest(request, env, ctx)` that both the Worker and the adapter call, and the route table becomes the single source of truth:

```ts
const routes: Record<string, { params: string[]; cache: string; run: (p, env) => Promise<unknown> }> = { ... };
```

I can write the cleaned-up `worker.ts` (items 1-8 and the route table) if you want. Paste `localAdapter.ts` too if you'd like the shared handler done in the same pass.
