# 🎯 YTFY Multi-Agent Orchestration Procedure

## Overview

**Objective:** Optimize YTFY for multi-device compatibility with premium UX/UI.

| Phase   | Agent      | Focus                                        |
| ------- | ---------- | -------------------------------------------- |
| Phase 1 | **Gemini** | UX/UI Design + Responsive Optimization       |
| Phase 2 | **Claude** | Code Implementation + OAuth Fix + VPS Deploy |

---

## 🔴 Issues to Address

### 1. Google OAuth Error

**Error:** `redirect_uri_mismatch` (Erreur 400)

**Root Cause:** The OAuth redirect URI configured in Google Cloud Console doesn't include `localhost:5173`.

**Fix Required:**

- Add `http://localhost:5173` to Authorized redirect URIs in Google Cloud Console
- Or use the production URL only for OAuth testing

### 2. Multi-Device Compatibility

Target devices:

- 📱 Mobile (iOS/Android)
- 📺 TV (Smart TV, Android TV, Apple TV)
- 💻 Desktop (PC, Mac)
- 📲 Tablet (iPad, Android tablets)
- 🚗 CarPlay / Android Auto
- ⌚ Smartwatch (WearOS, watchOS)
- 🔌 Connected devices (IoT)

---

## 📋 PHASE 1: GEMINI (UX/UI)

### Scope

1. Responsive breakpoints for all device categories
2. Touch-friendly controls with proper sizing
3. TV-optimized navigation (D-pad/remote)
4. CarPlay/Android Auto simplified UI
5. Smartwatch minimal interface
6. Accessibility enhancements (WCAG 2.1 AA)

### Deliverables

- Updated CSS tokens for breakpoints
- Device-specific component variants
- Design specifications document

---

## 📋 PHASE 2: CLAUDE (Code + Deploy)

### Scope

1. Fix Google OAuth `redirect_uri_mismatch`
2. Implement device detection
3. Add responsive CSS media queries
4. CarPlay/Android Auto media session API
5. Build and deploy to Netcup VPS

### Deliverables

- Fixed OAuth configuration
- Multi-device responsive code
- Production deployment

---

# 🚀 PROMPT FOR GEMINI (Phase 1)

Copy this prompt and give it to Gemini in a new task:

```
# YTFY Phase 1: Multi-Device UX/UI Optimization

## Context
I'm building a music streaming PWA (music.ml4-lab.com) that needs to work flawlessly across ALL device types. The Emerald Vinyl Noir theme is already implemented. Now I need responsive optimization.

## Target Devices
1. 📱 Mobile (360px-428px) - Touch, portrait/landscape
2. 📲 Tablet (768px-1024px) - Touch, larger touch targets
3. 💻 Desktop (1280px+) - Mouse/keyboard, sidebar nav
4. 📺 TV (1920px+) - D-pad navigation, 10-foot UI
5. 🚗 CarPlay/Android Auto - Minimal, glanceable, voice-first
6. ⌚ Smartwatch - Ultra-minimal, essential controls only

## Your Tasks

### 1. Breakpoint System
Update `src/styles/tokens.css` with:
- Mobile-first breakpoints
- TV-specific breakpoints (overscan safe zones)
- Touch target sizing (min 44px mobile, 56px TV)

### 2. NavBar Optimization
Update `src/components/NavBar.css`:
- Bottom bar on mobile
- Sidebar on desktop
- Focus-visible states for TV remote
- Hide on CarPlay/Watch (audio-only mode)

### 3. Player Optimization
Update `src/features/Player/`:
- Full-screen on mobile
- Side panel on desktop
- Simplified controls for TV (play/pause, skip, volume)
- Glanceable mode for CarPlay

### 4. Content Cards
Update `src/components/StreamItem.css`:
- Horizontal scroll on mobile
- Grid on desktop
- Large tiles on TV

### 5. Accessibility
- Focus indicators for keyboard/remote
- Reduced motion support
- High contrast mode capability

## Deliverables
1. Updated CSS files with all device optimizations
2. A summary document of changes made
3. A handoff prompt for Claude (Phase 2) with:
   - List of files modified
   - Instructions for backend OAuth fix
   - VPS deployment steps

## Important
- Keep the Emerald Vinyl Noir theme
- Build must pass (`npm run build`)
- Test with `npm run dev`
```

---

# 🔄 EXPECTED HANDOFF FROM GEMINI → CLAUDE

After Gemini completes Phase 1, they should provide a prompt like:

```
# YTFY Phase 2: Code Implementation + OAuth Fix + VPS Deploy

## Context
Gemini has completed Phase 1 (UX/UI). The following CSS files were updated:
- tokens.css (breakpoints, touch targets)
- NavBar.css (responsive nav)
- Player.css (multi-device player)
- StreamItem.css (responsive cards)

## Your Tasks

### 1. Fix Google OAuth
The error is `redirect_uri_mismatch`.
- Check backend OAuth config
- Add localhost:5173 to Google Cloud Console
- Or implement dynamic redirect URI

### 2. Device Detection (Optional)
Add JS detection for:
- TV mode (user-agent or resolution)
- CarPlay/Android Auto (media session API)

### 3. Build & Deploy
npm run build
ssh root@100.92.200.92 "cd /var/www/ytify && git pull && npm ci && npm run build && systemctl reload nginx"

### 4. Verify
- Test OAuth on production
- Test responsive on multiple devices
- Confirm all features work
```

---

## 📌 Quick Reference

| Task                    | Who    | Status     |
| ----------------------- | ------ | ---------- |
| UX/UI responsive design | Gemini | ⏳ Pending |
| OAuth fix               | Claude | ⏳ Pending |
| VPS deployment          | Claude | ⏳ Pending |

## Files to Modify

### CSS (Gemini)

- `src/styles/tokens.css`
- `src/styles/global.css`
- `src/components/NavBar.css`
- `src/components/StreamItem.css`
- `src/features/Player/Player.css`

### Backend/Config (Claude)

- Google Cloud Console OAuth settings
- `backend/src/routes/auth.ts` (if exists)
- `.env` or config files
