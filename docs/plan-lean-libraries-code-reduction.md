# Architecture Plan: Lean Libraries & Strategic Code Size Reduction

> **Status: Active Draft (RFC).**  
> **Target System:** `ytify` (SolidJS SPA + Cloudflare Worker Edge Backend)  
> **Direct Companions & Dependencies:**
>
> - [`plan-opfs-catalog-decoupled-cloudsync.md`](file:///C:/Users/Animesh/Documents/ytify/docs/plan-opfs-catalog-decoupled-cloudsync.md) — 4-Tier Local-First Catalog & Decoupled CloudSync Architecture.
> - [`plan-unified-architecture-refactoring.md`](file:///C:/Users/Animesh/Documents/ytify/docs/plan-unified-architecture-refactoring.md) — Core Directory Layout, Backend/Shared Extraction, Store Consolidation, & Composable UI Primitives.

---

## 1. Executive Summary & Philosophy

ytify enforces a strict **Zero-Bloat Budget**:

- Target initial JS entry: **$\le$ 23.5 KB gzipped**.
- Total production bundle: **< 200 KB gzipped**.
- **No unnecessary npm dependencies**. Native Web APIs (OPFS, Web Audio, MediaSession) and CSS custom properties must always be preferred over external runtime wrappers.

Historically, the reaction to bloat was to write **everything** from scratch. However, maintaining hundreds of lines of custom plumbing across timing, array manipulation, IndexedDB transactions, and API guard clauses has introduced:

1. **Utility bugs** (e.g., in-place array mutation in `shuffle` within `src/utils.ts`).
2. **Defensive code bloat** (e.g., dozens of lines of repetitive `typeof` / `in` checks for stream formats and sync payloads).
3. **Storage ceremony** (e.g., hundreds of lines of raw IndexedDB callback boilerplate for multi-store schemas).

This plan establishes a **pragmatic, budget-conscious library strategy**. Instead of adopting monolithic meta-frameworks or heavy functional platforms (such as `effect-ts`), we selectively integrate **featherweight (< 1.5 KB), tree-shakeable micro-libraries** that eliminate hundreds of lines of brittle handwritten code while keeping the total added bundle cost below **2.5 KB gzipped**.

---

## 2. Contextual Synthesis with Existing Architectural Plans

This plan operates in direct synergy with ytify's two primary architectural roadmaps:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                   docs/plan-opfs-catalog-decoupled-cloudsync.md                         │
│  • Tier 1: LocalStorage (< 50 KB, pure ID arrays & headers, synchronous Frame-1)       │
│  • Tier 2A: IndexedDB (idb_catalog: 'tracks' object store + 'unsubmitted_ids' store)   │
│  • Tier 2B: OPFS (catalog/*.json discovery & opus_cache/*.opus media)                  │
│  • Tier 3: Cloudflare Backend (UserSyncDO purely relational, NO track JSON blobs)      │
│  • Tier 4: GitHub Dataset (Sharded data/songs/{char}.json & knownIds.bin)              │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                   docs/plan-unified-architecture-refactoring.md                        │
│  • Strict Boundaries: src/backend/ (Worker) vs src/ (Client) vs src/shared/ (Isomorphic)│
│  • Shared Commons: src/shared/commons.ts (Pure duration, math, string, and array logic)│
│  • State Architecture: Single store.ts with automatic reactive persistence via effect │
│  • Composable UI: <ViewShell>, <MediaList>, <Shelf>                                    │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                       THIS PLAN: LEAN LIBRARY INTEGRATION                              │
│  1. 'idb' (~1.1 KB)        ──> Powers Tier 2A Multi-Store IndexedDB Engine             │
│  2. 'es-toolkit' (~600 B)   ──> Powers src/shared/commons.ts (Bug-free array & timing)  │
│  3. 'valibot' (~800 B)      ──> Validates Shards, Stream Data, & Boot Batch Invariants │
│  4. Native Primitives (0 B) ──> Replaces Object Differs & Storage Persistence Libs     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### The Architectural Shift: Problems Solved Without Libraries

Reviewing both companion plans reveals that **proper architecture eliminated the need for several previously considered libraries**:

1. **No Object Diffing Library (`microdiff` / `deep-diff`):**  
   Because [`plan-opfs-catalog-decoupled-cloudsync.md`](file:///C:/Users/Animesh/Documents/ytify/docs/plan-opfs-catalog-decoupled-cloudsync.md) normalizes `UserSyncDO` and collections into pure string ID arrays (`string[]`), diffing is solved using native JavaScript `Set` operations in under 5 lines of code.
2. **No State Persistence Library (Zustand-persist / Pinia-persist):**  
   [`plan-unified-architecture-refactoring.md`](file:///C:/Users/Animesh/Documents/ytify/docs/plan-unified-architecture-refactoring.md) demonstrates that Solid 1.x's fine-grained reactivity handles auto-persistence cleanly in a 5-line root `createEffect(() => lsSetJSON("config", store.config))` tracking proxy reads automatically.
3. **No External UI Component Library (Kobalte / Corvu / Melt):**  
   UI reuse is unified internally through composable layout primitives (`<ViewShell>`, `<MediaList>`, `<Shelf>`), preserving custom CSS styling with zero framework bloat.
4. **No Binary Parser Library:**  
   The 11-byte fixed-width ASCII key index (`known_ids.bin`) is manipulated using native browser `Uint8Array`, `TextDecoder("ascii")`, and a 15-line binary search.

---

## 3. Library Selection Matrix & Evaluation

| Library                       | Role in ytify                                                        | Bundle Cost (Gzip)       | Lines Saved        | Decision & Justification                                                                                                                        |
| :---------------------------- | :------------------------------------------------------------------- | :----------------------- | :----------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| **`idb`** (Jake Archibald)    | Powers Tier 2A IndexedDB (`tracks` + `unsubmitted_ids` stores)       | **~1.1 KB**              | **~180–220 lines** | **ADOPT (Essential).** Replaces raw IDB callbacks/transactions with async/await promises; supports versioned migrations.                        |
| **`es-toolkit`**              | Powers `src/shared/commons.ts` (array, math, timing)                 | **~600 B** (tree-shaken) | **~100–140 lines** | **ADOPT (High Value).** 2x-3x faster than lodash, 97% smaller; fixes array mutation bugs in `shuffle`; provides audited `debounce` and `chunk`. |
| **`valibot`**                 | Validates dataset shards (`data/songs/{char}.json`) & boot batch API | **~800 B** (tree-shaken) | **~80–110 lines**  | **ADOPT (Targeted).** Modular schema validation replacing verbose manual `typeof` / `in` guards without Zod's ~14 KB overhead.                  |
| **`@solid-primitives/media`** | Replaces manual `matchMedia` listeners in root shell                 | **~300 B**               | **~25–35 lines**   | **OPTIONAL / ACCEPT.** Native Solid primitive with automatic cleanup.                                                                           |
| **`effect` / `effect-ts`**    | Functional runtime, typed errors, structured concurrency             | **30–70+ KB**            | ~200 lines         | **REJECT (Client).** Completely busts the 23.5 KB initial JS entry budget. Reserved strictly for Cloudflare backend scrapers if ever needed.    |
| **`microdiff`**               | Object / collection tree diffing                                     | **~450 B**               | ~50 lines          | **REJECT (Superseded).** Architecture normalized state to ID arrays; native `Set` operations render it redundant.                               |
| **`zod`**                     | Schema validation                                                    | **~14 KB**               | ~100 lines         | **REJECT.** Far too heavy for a zero-bloat client when `valibot` achieves the same with < 1 KB.                                                 |

---

## 4. Detailed Implementation Blueprint

### Phase 1: Tier 2A IndexedDB Engine via `idb`

In [`plan-opfs-catalog-decoupled-cloudsync.md`](file:///C:/Users/Animesh/Documents/ytify/docs/plan-opfs-catalog-decoupled-cloudsync.md), Phase 1 specifies building `src/modules/trackStore.ts`. Raw IndexedDB code requires hundreds of lines of event listener wiring (`onupgradeneeded`, `onsuccess`, `onerror`, `transaction.oncomplete`).

Using **`idb`**, the entire Tier 2A database lifecycle and transactional store are defined cleanly:

```ts
// src/modules/trackStore.ts
import { openDB, type IDBPDatabase } from "idb";
import type { TrackItem } from "@shared/types";

const DB_NAME = "idb_catalog";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getCatalogDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Store 1: Normalized TrackItem records
        if (!db.objectStoreNames.contains("tracks")) {
          db.createObjectStore("tracks", { keyPath: "id" });
        }
        // Store 2: Queue of newly discovered track IDs pending boot batch upload
        if (!db.objectStoreNames.contains("unsubmitted_ids")) {
          db.createObjectStore("unsubmitted_ids");
        }
      },
    });
  }
  return dbPromise;
}

// In-memory O(1) runtime cache
export const memoryTracks = new Map<string, TrackItem>();

export async function initTrackStore(): Promise<void> {
  const db = await getCatalogDB();
  const allTracks = await db.getAll("tracks");
  for (const track of allTracks) {
    memoryTracks.set(track.id, track);
  }
}

export async function putTracks(tracks: TrackItem[]): Promise<void> {
  const db = await getCatalogDB();
  const tx = db.transaction(["tracks", "unsubmitted_ids"], "readwrite");
  for (const track of tracks) {
    memoryTracks.set(track.id, track);
    await tx.objectStore("tracks").put(track);
    await tx.objectStore("unsubmitted_ids").put(true, track.id);
  }
  await tx.done;
}
```

---

### Phase 2: Audited Commons via `es-toolkit`

In [`plan-unified-architecture-refactoring.md`](file:///C:/Users/Animesh/Documents/ytify/docs/plan-unified-architecture-refactoring.md), Phase 1 specifies creating `src/shared/commons.ts` and fixing the in-place array mutation in `src/utils.ts#L156`.

Instead of handwritten math and array algorithms, import granular utilities from `es-toolkit`:

```ts
// src/shared/commons.ts
import {
  shuffle as esShuffle,
  chunk as esChunk,
  uniq as esUniq,
} from "es-toolkit/array";
import { clamp as esClamp } from "es-toolkit/math";
import {
  debounce as esDebounce,
  throttle as esThrottle,
} from "es-toolkit/function";

// Export pure, audited utilities for both browser and worker
export const shuffle = esShuffle;
export const chunk = esChunk;
export const uniq = esUniq;
export const clamp = esClamp;
export const debounce = esDebounce;
export const throttle = esThrottle;

// Custom domain-specific helpers (retained in commons.ts)
export function parseDuration(d: string): number {
  const parts = d.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0] * 60;
  return 0;
}
```

- **Outcome**: Eliminates duplicate debounce implementations in `src/index.tsx`, `Search`, and `Player`; guarantees immutable shuffling for queue playback; provides chunking for batch uploads.

---

### Phase 3: Dataset Shard & Staging Validation via `valibot`

In [`plan-opfs-catalog-decoupled-cloudsync.md`](file:///C:/Users/Animesh/Documents/ytify/docs/plan-opfs-catalog-decoupled-cloudsync.md), the client consumes GitHub dataset shards (`data/songs/{char}.json`) and posts new tracks to `POST /catalog/boot-batch`.

Using **`valibot`**, define shared validation schemas in `src/shared/schemas.ts`:

```ts
// src/shared/schemas.ts
import {
  object,
  string,
  number,
  optional,
  array,
  parse,
  type InferOutput,
} from "valibot";

export const TrackItemSchema = object({
  id: string(),
  title: string(),
  author: string(),
  duration: number(),
  img: string(),
  albumId: optional(string()),
  music: optional(string()), // "MUSIC_VIDEO_TYPE_ATV" | "MUSIC_VIDEO_TYPE_OMV"
});

export type ValidatedTrackItem = InferOutput<typeof TrackItemSchema>;

export const BootBatchPayloadSchema = object({
  tracks: array(TrackItemSchema),
});

export function validateTrackItem(data: unknown): ValidatedTrackItem {
  return parse(TrackItemSchema, data);
}
```

- **Outcome**: Replaces defensive `typeof` checks in `src/modules/getStreamData.ts` and `src/backend/worker.ts` with typed, tree-shaken validation costing under ~800 bytes.

---

## 5. Bundle Size & Verification Audit

### Projected Bundle Impact

```text
Current Initial JS Entry:   ~20.5 KB gzipped (dist/assets/index-*.js)
Budget Limit:               <= 23.5 KB gzipped

Library Additions:
  + idb (core promise engine)      : ~1.1 KB gzipped
  + es-toolkit (shuffle, clamp, etc): ~0.6 KB gzipped
  + valibot (track schema)         : ~0.8 KB gzipped
  --------------------------------------------------
  Total Added Weight               : ~2.5 KB gzipped

Code Deleted / Subtracted:
  - Raw IndexedDB boilerplate      : -1.2 KB uncompressed (-0.4 KB gzipped)
  - Duplicate debounce & timing    : -0.8 KB uncompressed (-0.3 KB gzipped)
  - Defensive type guard blocks    : -1.0 KB uncompressed (-0.3 KB gzipped)
  --------------------------------------------------
  Net Estimated Entry Size         : ~22.0 KB gzipped (Safely within 23.5 KB budget)
```

### Verification Checklist

Every phase must satisfy:

1. **Type Safety**: `bun run tsc --noEmit` passes with 0 errors across both `src/` and `src/backend/`.
2. **Dead Code Elimination**: `bun run knip` confirms zero unused exports or dangling dependencies.
3. **Unit Tests**: `bun test scripts/` passes cleanly.
4. **Bundle Audit**: `bun run build` verifies that `dist/assets/index-*.js` remains **$\le$ 23.5 KB gzipped** and total production output remains **< 200 KB gzipped**.

---

## 6. Conclusion & Roadmap Alignment

By anchoring library selection directly to the requirements of [`plan-opfs-catalog-decoupled-cloudsync.md`](file:///C:/Users/Animesh/Documents/ytify/docs/plan-opfs-catalog-decoupled-cloudsync.md) and [`plan-unified-architecture-refactoring.md`](file:///C:/Users/Animesh/Documents/ytify/docs/plan-unified-architecture-refactoring.md):

- We **avoid architectural bloat** by rejecting monolithic runtimes like `effect` on the client and avoiding redundant diffing/persistence packages.
- We **adopt minimal, surgical tools** (`idb`, `es-toolkit`, `valibot`) that solve specific, documented engineering needs.
- We **eliminate over 400 lines of brittle custom plumbing**, improving runtime reliability while preserving ytify’s zero-bloat standard.
