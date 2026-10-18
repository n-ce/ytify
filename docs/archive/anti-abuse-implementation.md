# Anti-Abuse Implementation Plan: Session Gate via `GET /s/`

## Overview
Implement the "Session Gate with Cryptographic ID" design from `anti-abuse.md` using `GET /s/` (no ID) as the session creation endpoint — same path, no new route.

---

## Edge Function Changes (`netlify/edge-functions/stream.ts`)

### 1. New Type
```ts
interface SessionRecord {
  createdAt: number;
  ip: string;
}
```

### 2. `GET /s/` — Session Creation (no `id` param)
- Triggered when `context.params.id` is falsy
- Generate cryptographic session ID: `crypto.randomUUID()`
- Store in Blobs: key `session:${sessionId}`, value `{ createdAt: Date.now(), ip: clientIp }`
- Return JSON: `{ sessionId }`
- **Gate**: `HARD_BANNED_SUBNETS` check applies (abusers can't even get a session)

### 3. `GET /s/:id` — Session Verification Middleware (runs first)
- Read session ID from `x-session-id` header or `?s=` query param
- **Social bot fast-path** (before session check):
  ```ts
  const ua = request.headers.get("user-agent") || "";
  const isSocialBot = /facebookexternalhit|twitterbot|whatsapp|telegrambot|discordbot|slackbot|linkedinbot/i.test(ua);
  if (!isJson && isSocialBot) { /* serve HTML preview directly */ }
  ```
- Verify session:
  - Exists in Blobs
  - `Date.now() - createdAt >= 10000` (10s server-enforced wait)
  - IP matches stored `ip`
  - Not expired (`createdAt > Date.now() - 30*60*1000`)
- On failure: return 403 with `{ error: "Invalid or expired session" }`

### 4. Existing Logic (unchanged)
- 20s cooldown for JSON requests
- RapidAPI key selection
- Proxy to `yt-api.p.rapidapi.com/dl`
- HTML link preview generation

---

## Client Changes (`src/lib/modules/getStreamData.ts`)

### New Flow in `fetchData(proxy: string)`
```ts
async function fetchData(proxy: string): Promise<Invidious> {
  const path = proxy ? '/api/v1/videos/' : '/s/';
  
  // 1. Get or create session for local fallback (empty proxy)
  if (!proxy) {
    const sessionId = await getOrCreateSession();
    headers['x-session-id'] = sessionId;
  }
  
  const res = await fetch(proxy + path + id, { headers: { 'Accept': 'application/json', ...headers }, signal });
  // ... rest unchanged
}
```

### `getOrCreateSession()` Helper
- Check `sessionStorage.getItem('ytify_session')` for `{ sessionId, createdAt }`
- If valid and `Date.now() - createdAt >= 10000` → return `sessionId`
- Else → `GET /s/` → store `{ sessionId, createdAt: Date.now() }` in sessionStorage → wait 10s → return `sessionId`
- On 403 from `/s/:id` → clear sessionStorage, retry once

---

## Session Cleanup (Optional Hardening)
- **Lazy cleanup**: On each `/s/` call, scan and delete `session:*` keys older than 30min (max 10 per call to avoid blocking)
- **Or**: Migrate to HMAC-signed stateless tokens (no blob writes per session) — see `anti-abuse.md` Optional Hardening

---

## Zero-Budget Compliance
- ✅ No new npm dependencies
- ✅ Uses native `crypto.randomUUID()`
- ✅ Uses existing `@netlify/blobs` store (`rapidapi`)
- ✅ No external services

---

## Implementation Order
1. Add `SessionRecord` type
2. Implement `GET /s/` session creation
3. Add social bot fast-path + session verification to `GET /s/:id`
4. Update `getStreamData.ts` with `getOrCreateSession()`
5. Test: `netlify dev` → open app → verify 10s wait → verify playback works
6. Run `bun run build` to verify TypeScript + production build