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