# Plan: Immersive Mode Setting for Music Player

**Status:** Completed
**Date:** 2026-09-26

**Status: implemented as `playerBackground`, with the modes renamed.** The
`immersive`/`transparent` naming in this spec did not survive review: the
shipped values are `none | frost | frost-motion | blur | blur-motion`, and the
pane (`.bg-pane`) is stacked in every non-`none` background rather than being
omitted for the transparent pair. `.bg-pane` styles per family:
- `frost*` — the original treatment, `blur(4px)` + `0.8` `--onBg` veil.
- `blur*` — `blur(8px)`, no tint, so the mode actually blurs as named.

Other deltas from the plan below:
- The setting is exposed as a signal (`playerBackground`) plus
  `setPlayerBackground()`, mirroring `cachingMode`, so mode switches are
  reactive without a reload.
- `--player-bg` is still set in a `createEffect` (the plan removed it), now
  gated on the mode and returning early for `none` so nothing is painted per
  track when the background is off.
- The artwork thumbnail click cycle was added and then removed on request; the
  setting is the only way to change the background.
- Locale keys were renamed to `settings_player_background` / `settings_bg_*`
  ("Music Player Background", Frosted/Blurred) across all 21 locales. No
  migration shim was added since the setting was never released.
- `ontimeupdate` also guards `fullDuration > 0`, which removes a latent
  `-NaNpx` write on tracks with no metadata duration.

## Overview
Add a new setting `immersiveMode` with 5 options:
- **immersive** - Full blur background with artwork (current `immersive: true` behavior)
- **immersive-motion** - Immersive + parallax motion (current `--player-bp` animation)
- **transparent** - No blur, just artwork background (transparent pane)
- **transparent-motion** - Transparent + parallax motion
- **none** - No background artwork at all (default)

**Critical constraints:**
- Only applies to **music streams** (`playerStore.isMusic === true`)
- **Must NOT update CSS vars (`--player-bg`, `--player-bp`) continuously** when mode is `none` or `transparent` (currently updates on every `ontimeupdate` even when immersive is off)

## Current Implementation Analysis

### Player Store (`src/lib/stores/player.ts`)
- `immersive: boolean` (line 47, default `false` at line 83)
- `--player-bg` set in `Player/index.tsx:39` via `cssVar("--player-bg", url)` when `immersive` becomes true
- **`--player-bp` updated continuously in `ontimeupdate` (lines 240-248)** - **THIS IS THE BUG**: runs regardless of `immersive` state

### Player View (`src/features/Player/index.tsx`)
- Lines 37-40: `createEffect` sets `--player-bg` when `immersive` changes
- Lines 49-52: Shows `.bg-pane` (blur) and `.bg-image` (artwork) only when `immersive` true

### Player CSS (`src/features/Player/Player.css`)
- `.bg-pane`: Semi-transparent blur backdrop (line 15-16)
- `.bg-image`: Full-screen artwork with `background-image: var(--player-bg)` and `background-position: var(--player-bp)` (lines 25-38)

### Config (`src/lib/utils/config.ts`)
- No `immersiveMode` setting yet
- Settings UI in `src/features/Settings/index.tsx` uses `Selector` and `Toggle` components

## Implementation Plan

### Phase 1: Add Config Setting
**File:** `src/lib/utils/config.ts`

```typescript
export type ImmersiveMode = "none" | "immersive" | "immersive-motion" | "transparent" | "transparent-motion";

export let config = {
  // ... existing
  immersiveMode: "none" as ImmersiveMode,
};
```

Add to `setConfig` persistence and default config.

### Phase 2: Update Player Store
**File:** `src/lib/stores/player.ts`

1. **Replace `immersive: boolean` with `immersiveMode: ImmersiveMode`** (derived from config)
2. **Guard `--player-bp` update** in `ontimeupdate` (lines 240-248):
   ```typescript
   // Only update --player-bp if mode has motion
   const mode = config.immersiveMode;
   if (mode.includes("motion") && ref) {
     // ... existing parallax calculation
     cssVar("--player-bp", `-${shift}px 0`);
   }
   ```
3. **Set `--player-bg` only when needed** (not on every track if mode is `none`)

### Phase 3: Update Player View
**File:** `src/features/Player/index.tsx`

1. Read `config.immersiveMode` instead of `playerStore.immersive`
2. Conditional rendering:
   ```tsx
   const mode = config.immersiveMode;
   const showBgPane = mode.startsWith("immersive");      // blur pane
   const showBgImage = mode !== "none";                  // artwork
   const isTransparent = mode.startsWith("transparent"); // no blur
   ```
3. Apply CSS class to `#playerSection` for styling differences

### Phase 4: Update Player CSS
**File:** `src/features/Player/Player.css`

```css
#playerSection {
  /* Base: no background */
  
  &.mode-transparent .bg-pane {
    background-color: transparent;
    backdrop-filter: none;
  }
  
  &.mode-immersive .bg-pane {
    background-color: hsl(from var(--onBg) h s l / 0.8);
    backdrop-filter: blur(var(--size-px-1));
  }
  
  .bg-image {
    opacity: 1;
    transition: opacity 0.3s ease;
  }
  
  &.mode-none .bg-image {
    display: none; /* or opacity: 0 */
  }
}
```

### Phase 5: Settings UI
**File:** `src/features/Settings/index.tsx`

Add new `Selector` for `immersiveMode`:
```tsx
<Selector
  label="settings_immersive_mode"
  id="immersiveModeSelector"
  onchange={(e) => setConfig("immersiveMode", e.target.value as ImmersiveMode)}
  value={config.immersiveMode}
>
  <option value="none">{t("settings_immersive_none")}</option>
  <option value="immersive">{t("settings_immersive_blur")}</option>
  <option value="immersive-motion">{t("settings_immersive_blur_motion")}</option>
  <option value="transparent">{t("settings_immersive_transparent")}</option>
  <option value="transparent-motion">{t("settings_immersive_transparent_motion")}</option>
</Selector>
```

Add translation keys in locale files.

### Phase 6: Clean Up Legacy `immersive` Boolean
- Remove `immersive` from `PlayerStore` type
- Remove `createEffect` in `Player/index.tsx` that sets `--player-bg`
- Update any other references

## Key Behavioral Rules

| Mode | Blur Pane (`.bg-pane`) | Artwork (`.bg-image`) | Parallax (`--player-bp`) |
|------|------------------------|----------------------|-------------------------|
| `none` | ❌ Hidden | ❌ Hidden | ❌ Never updated |
| `immersive` | ✅ Blur | ✅ Visible | ❌ Static |
| `immersive-motion` | ✅ Blur | ✅ Visible | ✅ Updated on timeupdate |
| `transparent` | ❌ Transparent | ✅ Visible | ❌ Static |
| `transparent-motion` | ❌ Transparent | ✅ Visible | ✅ Updated on timeupdate |

## Music-Only Enforcement
- All background rendering gated by `playerStore.isMusic`
- Video mode (`isWatching && !isMusic`) never shows these backgrounds
- Config setting still visible in Settings but only takes effect for music

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/utils/config.ts` | Add `immersiveMode` type + config entry |
| `src/lib/stores/player.ts` | Replace `immersive` boolean, guard `--player-bp` updates |
| `src/features/Player/index.tsx` | Use config, conditional rendering |
| `src/features/Player/Player.css` | Style variants for each mode |
| `src/features/Settings/index.tsx` | Add Selector for immersiveMode |
| Locale files (`src/locales/*.json`) | Add translation keys |

## Testing Checklist
- [x] `none`: No bg vars updated, no background elements rendered
- [x] `immersive`: Blur pane + static artwork, no parallax
- [x] `immersive-motion`: Blur pane + artwork + parallax on progress
- [x] `transparent`: No blur, static artwork, no parallax
- [x] `transparent-motion`: No blur, artwork + parallax
- [x] Switching modes at runtime works without reload
- [x] Video mode unaffected
- [x] CSS vars not hammered when mode = `none` (verify in DevTools)

## Estimate
- **Config + Store + View + CSS:** ~2 hours
- **Settings UI + Locales:** ~1 hour
- **Testing & Polish:** ~1 hour
- **Total:** ~4 hours