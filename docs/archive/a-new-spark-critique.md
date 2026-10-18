# Architecture Review: Vulnerabilities, Edge Cases & Remediation Plan

**Associated Plan**: [`docs/plans/active/a-new-spark.md`](file:///C:/Users/Animesh/Documents/ytify/docs/plans/active/a-new-spark.md)  
**Implementation Review**: [`docs/plans/active/a-new-spark-review.md`](file:///C:/Users/Animesh/Documents/ytify/docs/plans/active/a-new-spark-review.md)  
**Status**: Critical Review & Technical Debt Specification

---

## Executive Summary

While the four core pillars of the "A New Spark" architecture have been integrated and unit tested, a rigorous audit reveals **five significant architectural vulnerabilities, split-brain state concerns, and incomplete transitions**.

This document outlines each vulnerability in depth, provides the technical rationale for why it breaks guarantees under edge conditions, and specifies the exact remediation blueprint.

---

## 1. Vulnerability Breakdown & Analysis

### 1.1 Dual-Boundary Concurrency Leak: Fail-Open Isolate Fallback
* **Severity**: 🔴 **CRITICAL** (Directly violates zero-concurrency mandate)
* **Location**: [`netlify/edge-functions/stream.ts`](file:///C:/Users/Animesh/Documents/ytify/netlify/edge-functions/stream.ts#L295-L315)
* **Mechanism**:
  The audio proxy runs on Netlify Edge Functions (Deno isolates on global CDN PoPs), while `StreamGateDO` runs in Cloudflare Workers. When `callGate("acquire")` encounters a timeout (`GATE_TIMEOUT_MS = 3000`) or transient worker error, the code falls back to isolate-local memory:
  ```typescript
  // Gate unreachable: fall back to isolate-local bookkeeping
  const now = Date.now();
  const lastCall = localLastCall.get(ip);
  ...
  localInFlight.set(sessionId, now + LEASE_TTL_MS);
  return { ok: true, mode: "local", keyIndex: Math.floor(...) };
  ```
* **Failure Mode**:
  Netlify spins up dozens of distinct Deno isolates across geographically distributed edges. Under transient network jitter, cross-cloud latency spikes, or deliberate gate DDoS attacks, the gate fails open. Each distinct Deno isolate grants a separate local lease to parallel requests. RapidAPI receives concurrent calls, defeating concurrency immunity.
* **Remediation Target**:
  - **Fail Closed**: If the authoritative `StreamGateDO` is unreachable, the edge function MUST return an immediate `503 Service Unavailable` or `429 Too Many Requests` with a short `Retry-After: 3` header.
  - Eliminate `mode: "local"` lease issuance for audio fallback requests.

---

### 1.2 The Cloudsync "Normalization Crisis" Incomplete Migration
* **Severity**: 🟡 **HIGH** (Leaves data duplication intact; metadata updates do not propagate)
* **Location**: [`src/backend/UserSyncDO.ts`](file:///C:/Users/Animesh/Documents/ytify/src/backend/UserSyncDO.ts#L100-L135)
* **Mechanism**:
  The plan stated:
  > *"we are facing a normalization crisis in Cloudsync that stores all user data's tracks without identity/separation"*
  
  In the current implementation, `UserSyncDO` still persists the entire raw track JSON blob into each user's SQLite table (`tracks(id, data, modified)`):
  ```typescript
  this.sql.exec(
    "INSERT INTO tracks (id, data, modified) VALUES (?, ?, ?)",
    id, JSON.stringify(trk), trk.modified || now
  );
  ```
  It merely added a write-through projection (`writeThroughToCatalog`) that writes a copy to `CatalogDO`.
* **Failure Mode**:
  1. **Storage Bloat**: 1,000 users with the same song in their library duplicate 1,000 full JSON records across 1,000 DO SQLite instances.
  2. **Metadata Drift**: When `fixMetadata` or the weekly scraper updates canonical artist or title information in `CatalogDO`, **existing user libraries never see the fix**. A user library retains its original corrupted snapshot until the user manually triggers a full client-side reset.
* **Remediation Target**:
  - Transition `UserSyncDO` to store relational track references:
    ```sql
    CREATE TABLE user_library (
      track_id TEXT PRIMARY KEY,
      added_at INTEGER NOT NULL,
      custom_tags TEXT
    );
    ```
  - When serving `GET /sync` or `GET /library`, join or hydrate track IDs against `CatalogDO` so canonical metadata updates automatically reflect in every user's library.

---

### 1.3 Split-Brain Session State via Netlify Blobs
* **Severity**: 🟡 **HIGH** (Allows session pool pre-warming and bot abuse)
* **Location**: [`netlify/edge-functions/stream.ts`](file:///C:/Users/Animesh/Documents/ytify/netlify/edge-functions/stream.ts#L60-L95)
* **Mechanism**:
  Session minting (`issueSession`) and validation (`verifySession`) rely on **Netlify Blobs** (`getStore("rapidapi")`).
  While in-flight execution is gated by `StreamGateDO`, session creation is un-gated and un-metered in Netlify Blobs.
* **Failure Mode**:
  1. An abuser can send 100 rapid requests to `GET /s/` to issue 100 valid session UUIDs in Netlify Blobs.
  2. After waiting the 10-second `SESSION_MIN_AGE_MS` warm-up delay, the abuser can rotate through these pre-warmed tokens across different proxy IPs or sequential bursts.
  3. Netlify Blobs writes are eventually consistent and incur external API round-trips for every stream initiation.
* **Remediation Target**:
  - **Stateless HMAC Sessions OR Gate-Managed Sessions**:
    - *Option A (Stateless)*: Issue cryptographically signed tokens containing timestamp and IP hash:
      $$\text{Token} = \text{HMAC-SHA256}(IP + Timestamp, Secret)$$
      This eliminates Netlify Blobs entirely, removing external KV latency and storage limits.
    - *Option B (Gate-Managed)*: Let `StreamGateDO` issue and validate session leases directly alongside the IP cooldown window.

---

### 1.4 Hard Dependency on Cloudflare Queues Paid Feature
* **Severity**: 🟠 **MEDIUM** (Blocks deployment on Cloudflare Free tier)
* **Location**:
  - [`wrangler.toml`](file:///C:/Users/Animesh/Documents/ytify/wrangler.toml#L32-L40)
  - [`src/backend/worker.ts`](file:///C:/Users/Animesh/Documents/ytify/src/backend/worker.ts#L480-L500)
* **Mechanism**:
  The weekly scraping pipeline requires Cloudflare Queues bindings (`[[queues.producers]]` and `[[queues.consumers]]`).
  On Cloudflare Workers Free accounts, Queues are unavailable; `wrangler deploy` throws an error or `env.SCRAPER_QUEUE` is undefined.
  In `worker.ts`, the cron handler fails silently:
  ```typescript
  if (!env.SCRAPER_QUEUE) {
    console.warn(`[cron] ... SCRAPER_QUEUE not bound, ${categories.length} categories skipped`);
    return;
  }
  ```
* **Failure Mode**:
  On self-hosted, community, or free-tier deployments, weekly dataset refreshes never execute, leaving the database stale.
* **Remediation Target**:
  - Provide an automated fallback mechanism using **Durable Object Alarms**:
    - If `SCRAPER_QUEUE` is unbound, `CatalogDO` can schedule an internal alarm to chunk and scrape 2 categories per alarm execution, self-rescheduling until all categories are processed without exceeding execution limits.

---

### 1.5 Link Preview Cache Stampede on Cold Track Lookups
* **Severity**: 🟢 **LOW / MEDIUM** (Redundant external requests on viral link sharing)
* **Location**: [`netlify/edge-functions/stream.ts`](file:///C:/Users/Animesh/Documents/ytify/netlify/edge-functions/stream.ts#L160-L195)
* **Mechanism**:
  When a link preview misses `CatalogDO`, it makes an outbound request to YouTube's public oEmbed endpoint, followed by an asynchronous write-through back to `CatalogDO`.
* **Failure Mode**:
  When a new or uncached link is shared in a large Discord, Telegram, or Slack channel, dozens of crawler user agents hit `/s/:id` simultaneously. All crawlers experience a catalog miss, resulting in dozens of parallel requests to YouTube oEmbed and duplicate concurrent write-through requests to `CatalogDO`.
* **Remediation Target**:
  - Implement single-flight request coalescing (in-flight promise map per video ID) in the edge function or enforce short edge caching headers (`s-maxage=60`) on the preview response.

---

## 2. Remediation Priority Matrix

| Item | Problem | Impact | Remediation Action |
| :--- | :--- | :--- | :--- |
| **1.1** | Fail-open isolate fallback | Concurrency leak to RapidAPI under gate timeout | Fail closed (`503`/`429`) on gate unavailability |
| **1.2** | Denormalized UserSyncDO | Library storage duplication & stagnant metadata | Store relational IDs in user DO; hydrate from `CatalogDO` |
| **1.3** | Netlify Blobs session storage | Session pre-warming & KV latency | Switch to stateless HMAC tokens or DO-managed sessions |
| **1.4** | Unbound Queue dependency | Scraper completely halts on free tier | Add self-rescheduling DO alarm fallback |
| **1.5** | Cold preview cache stampede | Duplicate oEmbed & catalog write requests | Add in-flight coalescing or edge cache headers |

---

## 3. Detailed Fix Specifications

### Fix 1.1: Enforce Fail-Closed Gate Semantics in `stream.ts`
Replace the local isolate fallback:
```typescript
// Replace this:
localInFlight.set(sessionId, now + LEASE_TTL_MS);
return { ok: true, mode: "local", keyIndex: Math.floor(Math.random() * keyCount) };

// With this:
console.warn(`[GATE-UNREACHABLE] Unable to acquire lease for IP ${ip}. Failing closed.`);
return {
  ok: false,
  status: 503,
  retryAfterMs: 3000,
};
```
And return an appropriate response:
```typescript
if (lease.status === 503) {
  return new Response(
    JSON.stringify({ error: "Stream gateway temporarily unavailable. Please retry." }),
    {
      status: 503,
      headers: {
        "content-type": "application/json",
        "Retry-After": "3",
        "Cache-Control": "no-store",
      },
    }
  );
}
```

---

### Fix 1.2: Relational User Library & Catalog Hydration in `UserSyncDO.ts`
1. **Schema Migration**:
   ```sql
   CREATE TABLE IF NOT EXISTS user_tracks (
     track_id TEXT PRIMARY KEY,
     added_at REAL NOT NULL,
     play_count INTEGER DEFAULT 0,
     custom_tags TEXT
   );
   ```
2. **Read Hydration**:
   On `GET /sync` or `GET /library`:
   - Fetch all `track_id` values from user SQLite.
   - Batch-fetch full canonical track data from `CatalogDO.readTracks(ids)`.
   - Hydrate and return clean, canonical track objects to the client.

---

### Fix 1.3: Stateless HMAC-Signed Sessions
Eliminate Netlify Blobs for sessions by signing a timestamped payload:
```typescript
async function createSignedSessionToken(ip: string, secret: string): Promise<string> {
  const payload = `${Date.now()}:${ip}`;
  const sig = await hmacSha256(payload, secret);
  return btoa(`${payload}:${sig}`);
}

async function verifySignedSessionToken(token: string, ip: string, secret: string): Promise<boolean> {
  const decoded = atob(token).split(":");
  const [timestampStr, tokenIp, sig] = decoded;
  const timestamp = parseInt(timestampStr, 10);
  const now = Date.now();

  // Check warm-up (10s) and TTL (30m)
  if (now - timestamp < SESSION_MIN_AGE_MS || now - timestamp > SESSION_TTL_MS) return false;
  if (tokenIp !== ip) return false;

  const expectedSig = await hmacSha256(`${timestamp}:${ip}`, secret);
  return sig === expectedSig;
}
```
*Benefits*: Zero network I/O, zero database storage, cryptographically tamper-proof, and immune to KV replication lag.

---

### Fix 1.4: Queue-Free Scraper Scheduling via DO Alarms
In `src/backend/CatalogDO.ts`:
```typescript
async alarm(): Promise<void> {
  // Read remaining category slugs from SQLite queue table
  const nextCategories = this.sql.exec<Category>(
    "SELECT slug, type, title, params FROM pending_scrape LIMIT 2"
  ).toArray();

  if (nextCategories.length === 0) return;

  for (const cat of nextCategories) {
    const result = await scrapeCategory(cat);
    this.upsertPlaylists(result.playlists);
    this.upsertTracks(result.tracks);
    this.sql.exec("DELETE FROM pending_scrape WHERE slug = ?", cat.slug);
  }

  // Schedule next batch 5 seconds later
  await this.ctx.storage.setAlarm(Date.now() + 5000);
}
```
*Benefits*: Runs fully within the Cloudflare Workers Free tier without requiring a paid Cloudflare Queues plan.
