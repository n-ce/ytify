# Audio Streaming Specification

## Purpose
Provide robust, high-quality audio streaming from YouTube/YouTube Music with minimal buffering, even on low-speed networks.

## Requirements

### REQ-AS-001: Multi-Proxy Failover
The system MUST attempt streaming from multiple Invidious proxy instances in sequence until one succeeds.
- **Instances**: 4 public proxies + 1 local edge function fallback
- **Order**: Current proxy → shuffled instances → local fallback
- **Failure handling**: Log warning, try next proxy
- **Timeout**: 10s per proxy attempt

### REQ-AS-002: Quality Selection
The system MUST support user-configurable quality tiers.
- **Tiers**: low (48kbps), medium (128kbps), high (256kbps), worst (lowest available)
- **Selection**: Filter adaptiveFormats by bitrate, prefer Opus/WebM
- **Persistence**: Quality preference saved to localStorage
- **Default**: medium

### REQ-AS-003: Stream Caching
The system MUST cache successful stream responses in memory.
- **Cache key**: Video ID
- **TTL**: Session lifetime
- **Invalidation**: On proxy change or error
- **Max entries**: 50 (LRU eviction)

### REQ-AS-004: Format Validation
The system MUST validate stream response structure before use.
- **Required fields**: adaptiveFormats array, each with type, bitrate, url
- **Audio formats**: At least one format with type starting with "audio"
- **Rejection**: Throw descriptive error if validation fails

### REQ-AS-005: Error Recovery
The system MUST recover gracefully from streaming errors.
- **Network error**: Retry with next proxy (max 3 retries)
- **Format error**: Clear cache, retry with next proxy
- **CORS error**: Try local edge function
- **All failed**: Surface user-facing error via snackbar

### REQ-AS-006: Proxy Persistence
The system MUST persist working proxy across session.
- **Storage**: playerStore.proxy
- **Reset**: On manual quality change or explicit reset
- **Fallback**: Shuffle instances on new session

## Completeness Criteria
| Criterion | Status |
|-----------|--------|
| All 5 proxies tested and working | ⬜ |
| Quality selection changes bitrate | ⬜ |
| Cache invalidates on proxy change | ⬜ |
| Format validation rejects bad responses | ⬜ |
| Error recovery tries all proxies | ⬜ |
| Proxy persists across navigation | ⬜ |
| Unit tests for proxy selection logic | ⬜ |
| Integration test with real YouTube IDs | ⬜ |

## Related Files
- `src/lib/modules/getStreamData.ts` - Core streaming logic
- `src/lib/modules/setAudioStreams.ts` - Format selection
- `src/lib/modules/audioErrorHandler.ts` - Error recovery
- `src/backend/utils.ts` - Invidious API helpers
- `src/lib/stores/player.ts` - Player integration

## Non-Goals
- Direct YouTube API (requires API key)
- Video streaming (handled by Player feature)
- DRM-protected content

---

# Emergency Fallback Proxy

The last-resort proxy behind `netlify/edge-functions/stream.ts` fronts a
metered RapidAPI endpoint, so it is the one part of the pipeline that costs
quota. Two invariants govern it.

### REQ-FB-001: Content Gating
An HTML request MUST never reach RapidAPI.
- `/s/:id` with `Accept: application/json` is the only audio path
- Everything else (browsers, social bots, preview scrapers) is served from the
  global catalog or YouTube oEmbed — see `docs/systems/catalog.md` REQ-CAT-004

### REQ-FB-002: Single-Writer Lease
At most one upstream call may be in flight per lease key, and admission is
atomic.
- The gate is `StreamGateDO`, one globally unique single-threaded actor, so its
  read-check-write cannot race (Netlify Blobs is eventually consistent and can
  never guarantee this)
- Leases are keyed by session id (falling back to client IP), so unrelated
  clients stay independent while a burst from one client serialises
- A rejected acquire is answered `429`/`403` immediately — no queuing, no retry
  amplification
- The upstream fetch is aborted at the same deadline the lease expires at, so a
  hung provider cannot leave an in-flight call behind a freed lease
- Quota starvation is covered by the per-IP cooldown in the same DO: one call per
  IP per 20s window, regardless of how many sessions that IP pre-opened
- RapidAPI key rotation and remaining-quota telemetry live in the DO's SQLite,
  not in edge state, so every isolate sees the same balances

### REQ-FB-003: Fail Closed
The gate is the only authority on concurrency, so an unreachable gate MUST NOT
be worked around.
- A gate timeout or transport failure returns `503` with `Retry-After`, never a
  locally minted lease
- Isolate-local leases were tried and are worthless here: Netlify runs dozens of
  Deno isolates across its PoPs, so each one would hand out its own lease under
  exactly the conditions (jitter, cross-cloud latency, a flood aimed at the
  worker) that make concurrency protection matter. An unaccounted lease is an
  unaccounted RapidAPI call
- Availability is defended on the client instead: `getStreamData` retries a
  `429` or `503` twice on the `Retry-After` hint before giving up

### Client Behaviour
`getStreamData` treats a `429` (lease conflict) or `503` (gate unreachable) from
the fallback as a transient lease problem and retries twice on the `Retry-After`
hint before surfacing an error, rather than burning the next proxy's lease.

### Sessions
`GET /s/` mints a session token. With `session_secret` configured it is a
stateless HMAC token (`<issuedAt>.<signature>` over `issuedAt:ip`), so there is
no Blobs round trip on every stream initiation and no pool of pre-warmed session
ids an abuser could rotate through. Without the secret the Blobs-backed store is
kept for local dev and self-hosting. See `docs/systems/catalog.md` REQ-CAT-008.

## Related Files (fallback)
- `netlify/edge-functions/stream.ts` - edge proxy, preview pipeline, gate client
- `src/backend/StreamGateDO.ts` - lease, cooldown and key telemetry store
- `src/backend/worker.ts` - `/api/stream-gate*` proxy route
- `src/lib/modules/getStreamData.ts` - client retry handling
- `scripts/stream.test.ts` - signed session properties

## Non-Goals (fallback)
- A general rate limiter: the lease and cooldown only guard the meted upstream
- Trusting client-supplied timers: every wait is enforced server-side
- A local fallback when the gate is down: that is the failure mode being removed
