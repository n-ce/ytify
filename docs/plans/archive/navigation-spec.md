# Plan: Navigation/Layout/UX/UI Spec

## Goal
Create `openspec/specs/navigation/spec.md` for app shell, routing, layout, drawer, and UI primitives.

## Requirements

### REQ-NAV-001: App Shell
- `src/App.tsx`: Providers (Theme, I18n, Config) + Router
- Semantic layout: `<header>`, `<main>`, `<footer>`
- Persistent header with: logo, search, theme toggle, user menu
- Footer with: version, links

### REQ-NAV-002: Routing
- SolidJS Router with lazy routes
- Routes: `/`, `/search`, `/library`, `/playlist/:id`, `/channel/:id`, `/artist/:id`, `/album/:id`, `/settings`, `/queue`
- SPA fallback (Netlify `_redirects`, Cloudflare Pages config)
- Browser back/forward works

### REQ-NAV-003: Drawer/Sidebar
- Left drawer: Library collections (collapsible)
- Right drawer: Queue (collapsible)
- Responsive: drawer → bottom sheet on mobile (<768px)
- Panel ratio persisted in `config.drawer`

### REQ-NAV-004: URL State Sync
- Search: `?q=...&f=...`
- Playlist: `/playlist/:id`
- Library section: `/library?section=favorites`
- Deep linking works on reload

### REQ-NAV-005: UI Primitives
- Button, IconButton, Input, Select, Slider, Toggle, Snackbar, Modal, Sheet, List, Avatar, Badge, Tooltip
- All in `src/lib/components/ui/`
- Accessible (ARIA, keyboard, focus management)
- Themed via CSS variables

### REQ-NAV-006: Focus Management
- Focus trap in modals/sheets
- Focus restoration on close
- Skip links for main content
- Visible focus indicators

## Completeness Criteria
| Criterion | Status |
|-----------|--------|
| All routes load lazily | ⬜ |
| Drawer works desktop + mobile | ⬜ |
| Panel ratio persists | ⬜ |
| URL sync on all routes | ⬜ |
| UI primitives accessible | ⬜ |
| Focus management works | ⬜ |

## Related Files
- `src/App.tsx`
- `src/lib/stores/navigation.ts`
- `src/lib/components/ui/*.tsx`
- `src/features/*/` (all feature routes)
- `public/_redirects`

## Non-Goals
- Animation library
- Complex gesture handling
- Virtual scrolling (handled per-feature)