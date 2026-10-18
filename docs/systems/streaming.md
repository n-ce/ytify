# Audio Streaming Specification

## Purpose

Provide robust, high-quality audio streaming from YouTube/YouTube Music with minimal buffering, protected by format validation, client IP binding, and single-flight lease gating to prevent rate-limit exhaustion.

---

## Architecture & Requirements

### REQ-AS-001: Quality Selection & Format Negotiation

The system MUST support user-configurable audio quality tiers:

- **Tiers**: `low` (~48kbps), `medium` (~128kbps, default), `high` (~256kbps), `worst` (lowest available).
- **Selection**: Filters `adaptiveFormats` by bitrate, prioritizing Opus audio in WebM containers for optimal compression and lower latency.
- **Persistence**: Quality preference is persisted to `localStorage` under `config.quality`.

### REQ-AS-002: Fallback Streaming via Netlify Edge (`stream.ts`)

When primary stream endpoints fail or hit rate limits, streaming falls back to the Netlify Edge Function (`/stream`):

- **Signed Session Tokens (HMAC-SHA256)**:
  Tokens format as `<issuedAt>.<HMAC-SHA256(issuedAt:ip, secret)>` (URL-safe base64). No database round-trip required.
- **Client IP Binding**:
  Tokens are cryptographically bound to the issuing client IP (supporting both IPv4 and colon-delimited IPv6 without breaking parsing).
- **Server-Enforced Warm-Up & TTL**:
  Enforces a 10-second warm-up window (`SESSION_MIN_AGE_MS`) before a session can be used, and a 30-minute expiration (`SESSION_TTL_MS`), defeating automated scrapers.
- **Constant-Time Verification**:
  Token signatures are verified using `crypto.subtle.verify` in constant time to prevent timing attacks.

### REQ-AS-003: Single-Flight Stream Gate (`StreamGateDO`)

Cloudflare Durable Object `StreamGateDO` serializes upstream requests and prevents rate-limit burns:

- **In-Memory Transient Leases**:
  Leases are held exclusively in the DO isolate memory (`Map<string, Lease>`) with a 10-second TTL. **Zero SQLite writes** are performed for transient leases, keeping DO storage usage safely at zero writes.
- **Single-Flight Concurrency**:
  At most one upstream call can be in flight per key at any given moment (`429 Too Many Requests` with `retryAfterMs` returned for concurrent calls on the same key).
- **Client IP Cooldown**:
  Enforces a 500ms cooldown per client IP to mitigate thundering herd retries.
- **Telemetry & Key Rotation**:
  Tracks remaining capacity and auto-rotates across available keys when exhaustion occurs.

### REQ-AS-004: In-Memory Stream Caching

- Stream resolution results are cached in client memory by video ID for the duration of the playback session.
- Cached items are invalidated upon manual quality re-selection or playback error.

---

## Completeness Criteria

| Criterion                                               | Status |
| ------------------------------------------------------- | ------ |
| User-configurable bitrate tiers (Opus/WebM prioritized) | ✅     |
| Fallback edge stream function with HMAC-SHA256 tokens   | ✅     |
| IPv4 and IPv6 client IP token binding                   | ✅     |
| Server-enforced 10s warm-up window and 30m TTL          | ✅     |
| StreamGateDO single-flight lease serialization          | ✅     |
| Zero SQLite writes on DO for audio leases               | ✅     |
| Client-side in-memory LRU stream caching                | ✅     |
