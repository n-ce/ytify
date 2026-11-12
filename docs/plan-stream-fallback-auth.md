# Architectural Plan: Client-Verified Stream Fallback & Time-Bounded Link Previews

## 1. Executive Summary & Problem Analysis

### Current Implementation (`netlify/edge-functions/stream.ts`)

Currently, `/s/:id` handles two distinct functions:

1. **Playback Stream Fallback (`Accept: application/json`)**: Called by `getStreamData.ts` when external Invidious proxies fail. Fetches direct audio streams from RapidAPI (`yt-api.p.rapidapi.com/dl?id=...`).
2. **Social Link Previews (`Accept: text/html`)**: Accessed by social media crawlers (Discord, Twitter/X, Telegram, WhatsApp) or direct browser links. Fetches metadata from RapidAPI to populate OpenGraph (`<meta property="og:title">`, etc.) tags before redirecting to `/?s=${id}`.

### Vulnerabilities of Current Architecture

- **Abuse via IP Hopping**: The current defense relies on `HARD_BANNED_SUBNETS` and a 20-second per-IP cooldown stored in `@netlify/blobs`. Attackers easily circumvent this using residential proxy pools, Tor, VPNs, or IPv6 prefix rotation.
- **Unauthenticated Free Audio API**: Any external actor can make automated JSON requests to `/s/:id`, burning through the owner's paid RapidAPI quota.
- **Link Preview Quota Burn**: Crawlers and link scrapers trigger expensive RapidAPI calls merely to read song titles and author names.
- **Netlify Blobs Bottleneck**: Reading and writing state to Netlify Blobs on every request adds 50–200ms latency and creates write-contention under load.

---

## 2. Proposed Architectural Model

The new model introduces two cryptographic gates:

1. **Stream Fallback Gate (`/s/:id?key=...`)**: Only authorized ytify client instances solving a lightweight cryptographic challenge or presenting a fresh signed token can access the audio stream JSON.
2. **Link Preview Gate (`/s/:id?ref=...`)**: User-generated share links contain a signed, timestamped reference token (`ref`). Link previews are rendered without consuming RapidAPI quota.

```
                              ┌─────────────────────────────────────────┐
                              │  Incoming Request: GET /s/:id?...       │
                              └────────────────────┬────────────────────┘
                                                   │
                       ┌───────────────────────────┴───────────────────────────┐
                       ▼                                                       ▼
            Accept: application/json                               Accept: text/html (or */*)
         (Client Stream Fallback)                               (Link Preview / Navigation)
                       │                                                       │
            Has valid `?key=` ?                                     Has valid `?ref=` ?
           ┌───────────┴───────────┐                               ┌───────────┴───────────┐
          YES                      NO                             YES                      NO
           │                       │                               │                       │
      Verify Key             403 Forbidden                  Extract metadata            Fallback
   (Time + PoW/HMAC)        (Zero API cost)                 from token or oEmbed     Generic Preview /
           │                                                       │                 Direct Redirect
     Hit RapidAPI                                             Render HTML            (Zero API cost)
  (Authorized Fallback)                                     (Zero API cost!)
```

---

## 3. Deep Dive: Stream Fallback Key (`?key=`)

### Requirements

- **Stateless Verification**: Edge functions must verify the key in $\le 1\text{ms}$ with zero database/Blob lookups.
- **Client-Side Generation**: The browser client generates the key on-the-fly when falling back to `/s/`.
- **Anti-Replay / Freshness**: Keys must expire within a short window ($\le 90\text{ seconds}$).
- **Anti-Scraping Resistance**: Automated scripts cannot bulk-generate thousands of keys without significant computational penalty.

### Recommended Key Design: Hybrid Time-Bounded Proof-of-Work (PoW) + Secret Hash

#### Key Format

`key = <timestamp>.<nonce>.<signature>`

- **`timestamp`**: Milliseconds epoch (`Date.now()`).
- **`nonce`**: Integer found by client solving a lightweight Hashcash puzzle.
- **`signature`**: Truncated HMAC or hash tying the `id`, `timestamp`, and `nonce` with a rotating or obfuscated application salt.

#### Client-Side Generation (`src/modules/streamAuth.ts`)

When `getStreamData.ts` falls back to the local endpoint:

1. Current time $T = \text{Date.now()}$.
2. Run a micro-PoW (difficulty = 4 leading hex zeros / 16 zero bits):
   - Iterate nonce until `SHA-256("${id}:${T}:${nonce}:${SALT}")` starts with `"0000"`.
3. Computation cost:
   - For a single track on client browser: ~10ms–30ms (imperceptible during audio buffering).
   - For an abuser attempting 10,000 scrapes: requires ~650,000,000 hash operations, burning their CPU and effectively shutting down scraping pipelines.

#### Edge Function Verification (`netlify/edge-functions/stream.ts`)

```ts
const key = url.searchParams.get("key");
if (!key)
  return new Response(JSON.stringify({ error: "Missing authorization key" }), {
    status: 403,
  });

const [tsStr, nonce, sig] = key.split(".");
const ts = parseInt(tsStr, 10);
const now = Date.now();

// 1. Freshness check: reject if older than 90s or clock drifted > 30s into future
if (isNaN(ts) || Math.abs(now - ts) > 90_000) {
  return new Response(
    JSON.stringify({ error: "Key expired or clock desynchronized" }),
    { status: 403 },
  );
}

// 2. Single SHA-256 verification (Takes < 0.2ms)
const expectedHash = await sha256(`${id}:${ts}:${nonce}:${SALT}`);
if (!expectedHash.startsWith("0000") || expectedHash.slice(-8) !== sig) {
  return new Response(
    JSON.stringify({ error: "Invalid cryptographic proof" }),
    { status: 403 },
  );
}
```

---

## 4. Deep Dive: Link Previews (`?ref=`)

### The Flaw in Querying RapidAPI for Previews

Currently, when a preview crawler hits `/s/:id`, the function queries RapidAPI just to read:

- `data.title`
- `data.channelTitle`

This needlessly burns API quota for social media crawlers.

### The Zero-Quota Solution for Link Previews

When a user clicks "Share" in ytify (`src/components/ActionsMenu/index.tsx`), the client **already has the track metadata in memory** (`title`, `author`, `id`)!

#### 1. Token Construction (`ref`)

The client encodes the metadata and timestamp into a compact, URL-safe signed payload:

```ts
// In src/modules/shareAuth.ts
export function createShareRef(track: TrackItem): string {
  const ts = Date.now();
  const payload = JSON.stringify({
    t: track.title,
    a: track.author,
    ts,
  });
  const b64 = toBase64Url(payload);
  const signature = computeHmacSnippet(track.id, b64);
  return `${b64}.${signature}`;
}
```

#### 2. Share URL

The resulting shared URL looks like:
`https://ytify.app/s/dQw4w9WgXcQ?ref=eyJ0IjoiU3RhcmJveSIsImEiOiJUaGUgV2Vla25kIiwidHMiOjE3Mzg1Mjg4MDB9.a7f9c2`

#### 3. Edge Function Processing for Previews

When `stream.ts` receives a GET request for `/s/:id?ref=...`:

1. If `ref` is present:
   - Verify signature and check timestamp validity (e.g. valid for 7 days or 30 days).
   - Parse `title` and `author` directly from the token!
   - Determine thumbnail deterministically:
     `https://i.ytimg.com/vi_webp/${id}/mqdefault.webp`
   - Return the HTML response with OpenGraph meta tags **instantly without calling RapidAPI**!
2. If `ref` is missing, corrupted, or expired:
   - For human visitors: redirect immediately to `/?s=${id}`.
   - For social crawlers: query YouTube's official, free, keyless **oEmbed API**:
     `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`
     This provides `title` and `author_name` without consuming any RapidAPI quota.

---

## 5. Security & Architectural Comparison

| Dimension                          | Current Setup                                    | New `key` & `ref` Architecture                                |
| :--------------------------------- | :----------------------------------------------- | :------------------------------------------------------------ |
| **Abuse Defense**                  | Hardcoded IP list + 20s Blobs cooldown           | Cryptographic proof-of-work + time-window signature           |
| **API Quota Consumption**          | High (burned by both scrapers and link crawlers) | Near-zero (RapidAPI called ONLY on genuine playback fallback) |
| **Edge Function Latency**          | 150–350ms (Blobs read + write + RapidAPI)        | <1ms rejection for bad actors; <5ms for link previews         |
| **Dependency on `@netlify/blobs`** | Critical path (blocks request)                   | Optional / telemetry only (not on hot path)                   |
| **Maintenance Burden**             | High (frequently updating banned subnets)        | Zero (automatic cryptographic enforcement)                    |

---

## 6. Implementation Checklist & Next Steps

1. **Client Cryptography Module (`src/modules/streamAuth.ts`)**:
   - Implement `generateStreamKey(id)` with fast WebCrypto SHA-256 PoW.
   - Implement `generateShareRef(track)` with base64url metadata + HMAC snippet.
2. **Update Fallback Fetcher (`src/modules/getStreamData.ts`)**:
   - Pass `?key=${await generateStreamKey(id)}` when querying `/s/${id}`.
3. **Update Share Menu (`src/components/ActionsMenu/index.tsx`)**:
   - Update share URL generator to append `?ref=${generateShareRef(track)}`.
4. **Refactor Edge Function (`netlify/edge-functions/stream.ts`)**:
   - Validate `?key=` for JSON requests (reject unauthorized access).
   - Parse `?ref=` for HTML requests (zero-quota preview generation).
   - Use YouTube oEmbed as safe fallback for preview crawlers without `ref`.
   - Remove or deprecate `HARD_BANNED_SUBNETS` and per-request Blobs writes.
