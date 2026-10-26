# Audio Streaming Specification

## Purpose

Provide robust, high-quality audio streaming from YouTube/YouTube Music with minimal buffering, protected by format validation, client IP binding, RapidAPI key selection, and a Blobs-backed abuse cooldown.

---

## Architecture & Requirements

### REQ-AS-001: Quality Selection & Format Negotiation

The system MUST support user-configurable audio quality tiers:

- **Tiers**: `low` (~48kbps), `medium` (~128kbps, default), `high` (~256kbps), `worst` (lowest available).
- **Selection**: Filters `adaptiveFormats` by bitrate, prioritizing Opus audio in WebM containers for optimal compression and lower latency.
- **Persistence**: Quality preference is persisted to `localStorage` under `config.quality`.

### REQ-AS-002: Fallback Streaming via Netlify Edge (`stream.ts`)

When primary stream endpoints fail or hit rate limits, streaming falls back to the Netlify Edge Function at `/s/:id`:

- **JSON Requests**:
  Clients send `Accept: application/json`. The function resolves the video through RapidAPI and returns the Invidious-compatible payload with `adaptiveFormats`.
- **HTML Requests**:
  Non-JSON requests receive a redirect/preview HTML page. Preview responses are cached for seven days.
- **No Session Handshake**:
  `/s/` session creation and signed session tokens are retired. Clients call `/s/:id` directly.
- **Hard-Banned Subnets**:
  Known abusive subnets are rejected before any RapidAPI or storage access.

### REQ-AS-003: RapidAPI Quota State & Abuse Cooldown

RapidAPI coordination is handled entirely inside the Netlify Edge Function using Netlify Blobs (`rapidapi/data`):

- **Key Selection**:
  The `keys` array tracks `remaining` quota and `resetsat` per configured key. The key with the most remaining quota is selected; exhausted keys reset after their advertised window.
- **Client IP Cooldown**:
  JSON requests from the same client IP within 20 seconds receive a bodyless `403` cached for 24 hours. Repeated violations increment `totalViolations`.
- **Violation Decay**:
  `totalViolations` decays by one every six hours and the IP record is removed when it reaches zero.
- **Quota Telemetry**:
  After each upstream response, the function persists `x-ratelimit-requests-remaining` and `x-ratelimit-requests-reset` for the selected key.
- **Best-Effort Scope**:
  Blobs state is eventually consistent, so the cooldown and quota counters are not a strict global lock. StreamGateDO and its cross-isolate single-flight lease are retired.

### REQ-AS-004: In-Memory Stream Caching

- Stream resolution results are cached in client memory by video ID for the duration of the playback session.
- Cached items are invalidated upon manual quality re-selection or playback error.

---

## Completeness Criteria

| Criterion                                               | Status |
| ------------------------------------------------------- | ------ |
| User-configurable bitrate tiers (Opus/WebM prioritized) | ?     |
| Fallback edge stream function at `/s/:id`               | ?     |
| RapidAPI key selection by remaining quota               | ?     |
| Blobs-backed IP cooldown and violation decay            | ?     |
| Hard-banned subnet fast path                            | ?     |
| Client-side in-memory LRU stream caching                | ?     |
| Collection link-preview edge function retired           | ?     |
