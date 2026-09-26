# Plan: Web Foundation Spec (Corrected)

## Goal
Create `openspec/specs/web/web-foundation.md` - minimal spec for the webpage requirement, delegating all tooling concerns.

## Core Insight
**We only specify what we directly control.** Everything else is delegated:
- HTML structure → Vite template (we don't manage it)
- CSS reset/normalize → Browser defaults + our custom properties (we only add vars)
- Build/dev server → Vite (we configure via vite.config.ts, don't spec it)
- Service worker → vite-plugin-pwa (we enable it, don't spec it)

## What We Actually Manage
1. **Entry point**: `src/index.tsx` - our TSX bootstrap
2. **Root component**: `src/App.tsx` - our shell with providers/router
3. **CSS variables**: `--bg`, `--fg`, `--accent`, etc. in `src/index.css`
4. **Manifest**: `public/manifest.webmanifest` - our PWA config

## Spec Requirements (Minimal)

### REQ-WEB-001: Webpage Exists
The project MUST produce a loadable webpage.
- **How**: Vite builds `index.html` + `src/index.tsx` → `dist/`
- **We provide**: `src/index.tsx`, `src/App.tsx`, `src/index.css`, `public/manifest.webmanifest`
- **Vite provides**: HTML template, dev server, build pipeline, SW

### REQ-WEB-002: Entry Point Mounts App
`src/index.tsx` MUST render our root component into `#root`.
- Imports `src/index.css`
- Calls `render(() => <App />, document.getElementById('root')!)`
- Registers SW if available (one-liner)

### REQ-WEB-003: App Shell Providers
`src/App.tsx` MUST provide theme/i18n/config contexts and router.
- `<ThemeProvider><I18nProvider><ConfigProvider><Router>...</Router></ConfigProvider></I18nProvider></ThemeProvider>`
- Semantic `<header><main><footer>` with `<Outlet>`

### REQ-WEB-004: CSS Variables Defined
`src/index.css` MUST define design tokens as CSS custom properties.
- `--bg`, `--fg`, `--accent`, `--border`, `--radius`, `--font-sans`, `--font-mono`
- `color-scheme: light dark` on `:root`

### REQ-WEB-005: Deployable to Static Hosts
Build output MUST work on Netlify and Cloudflare Pages without code changes.
- `bun run build` → `dist/`
- SPA fallback configured (Netlify `_redirects`, Cloudflare Pages config)
- CSP headers via platform config

## Completeness Criteria (Binary)
| Criterion | Status |
|-----------|--------|
| `bun run dev` loads page at localhost:5173 | ⬜ |
| `bun run build` produces `dist/index.html` + assets | ⬜ |
| `dist/` deploys to Netlify (SPA works) | ⬜ |
| `dist/` deploys to Cloudflare Pages (SPA works) | ⬜ |
| CSS variables usable in components | ⬜ |
| App shell renders header/main/footer | ⬜ |

## Related Files (Only What We Edit)
- `src/index.tsx`
- `src/App.tsx`
- `src/index.css`
- `public/manifest.webmanifest`
- `vite.config.ts` (only to verify build works)
- `public/_redirects` (Netlify SPA fallback)

## Non-Goals
- Vite configuration details
- HTML template structure
- Service worker implementation
- Browser default styles
- Build performance