# Plan: Video.js v10 Integration for Video Playback

## Goal
Integrate video.js v10 dynamically (lazy-loaded) only for video mode - not for audio. Replace native `<video>` element with video.js for enhanced controls, quality selection UI, and better cross-browser compatibility.

## Scope
- **In scope**: Video playback mode only (`isWatching === true`)
- **Out of scope**: Audio mode continues using native `<audio>` element
- **Bundle impact**: video.js (~100KB gzipped) loaded only when user enters video mode

## Requirements

### REQ-VJS-001: Dynamic Import
video.js MUST be loaded only when entering video mode.
- `import('video.js')` triggered on `isWatching` change to `true`
- Loading state while video.js loads
- Fallback to native `<video>` if import fails

### REQ-VJS-002: Quality Selection UI
video.js MUST expose quality selector matching our tiers.
- Integrate with `config.playback.quality` (low/medium/high/worst)
- Use `videojs-contrib-quality-levels` plugin
- Quality change updates shared config (syncs with audio)

### REQ-VJS-003: Stream Source Handoff
Switching Audio ↔ Video MUST preserve position and stream.
- On toggle: `currentTime` passed to video.js `currentTime()`
- Stream URL from `getStreamData` passed as `src`
- Same Invidious proxy used (shared proxy state)

### REQ-VJS-004: Player Skin/Theming
video.js MUST use ytify CSS variables.
- No video.js default CSS (we provide our own)
- Skin via CSS variables: `--vjs-bg`, `--vjs-fg`, `--vjs-accent`, `--vjs-slider-bg`
- Immersive mode works with video.js (artwork backdrop)

### REQ-VJS-005: Picture-in-Picture
PiP MUST work with video.js.
- `requestPictureInPicture()` on video.js tech
- Native PiP button in control bar
- Exit PiP restores inline player

### REQ-VJS-006: Media Session Integration
Media Session metadata MUST work with video.js.
- Title, artist, artwork from track metadata
- `setActionHandler('play'|'pause'|'seekto'...)` on video.js events
- Lock screen controls functional

### REQ-VJS-007: Keyboard Accessibility
video.js controls MUST be keyboard accessible.
- Tab through controls
- Space/Enter for play/pause
- Arrows for seek/volume
- Escape exits fullscreen/PiP

## Completeness Criteria
| Criterion | Status |
|-----------|--------|
| video.js loads only in video mode | ⬜ |
| Quality selector works (4 tiers) | ⬜ |
| Audio↔Video toggle preserves position | ⬜ |
| Theming via CSS variables | ⬜ |
| PiP works | ⬜ |
| Media Session works | ⬜ |
| Keyboard accessible | ⬜ |
| Bundle: video.js chunk < 120KB gzipped | ⬜ |
| No video.js code in audio mode bundle | ⬜ |

## Implementation Approach

### File Structure
```
src/features/Player/
├── Video.tsx              # video.js wrapper component
├── VideoPlayer.tsx        # video.js initialization + config
├── VideoQualityMenu.tsx   # Custom quality selector
└── useVideoJS.ts          # Hook for video.js lifecycle
```

### Lazy Loading Pattern
```tsx
// Video.tsx
const VideoJS = lazy(() => import('./VideoPlayer').then(m => ({ default: m.VideoPlayer })))

function Video({ track, isWatching, onToggle }) {
  if (!isWatching) return <AudioFallback />
  return <Suspense fallback={<VideoLoading />}><VideoJS {...props} /></Suspense>
}
```

### video.js Config
```typescript
// VideoPlayer.tsx
const player = videojs(videoEl, {
  controls: true,
  responsive: true,
  fluid: true,
  playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
  qualityLevels: { /* our 4 tiers */ },
  controlBar: {
    children: [
      'playToggle',
      'volumePanel',
      'currentTimeDisplay',
      'progressControl',
      'durationDisplay',
      'qualitySelector',  // custom
      'fullscreenToggle',
      'pictureInPictureToggle'
    ]
  }
})
```

## Related Files
- `src/features/Player/Video.tsx` (new)
- `src/features/Player/VideoPlayer.tsx` (new)
- `src/features/Player/VideoQualityMenu.tsx` (new)
- `src/lib/stores/player.ts` (isWatching, quality sync)
- `src/lib/modules/getStreamData.ts` (video format selection)
- `src/lib/modules/mediaSession.ts` (media session handlers)
- `src/index.css` (video.js CSS variable overrides)

## Non-Goals
- Audio mode uses video.js
- Casting (Chromecast, AirPlay)
- DRM/EME support
- Live streaming (DASH/HLS) - we use progressive MP4/WebM
- Subtitles/captions (future)