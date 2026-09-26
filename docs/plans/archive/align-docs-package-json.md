# Plan: Align Documentation & package.json Scripts

## Goal
Make package.json scripts and all documentation consistent:
- Use `bun` as runner everywhere (not pnpm/npm mix)
- Consistent script naming (no colons)
- Docs reference actual scripts only

## Changes Required

### package.json
| Current | Fixed |
|---------|-------|
| `test:backend` | `backend` |
| `build: "npm run icons && tsc && vite build"` | `build: "bun run icons && tsc && vite build"` |

### Documentation Updates
**GOVERNANCE.md** (lines 76-83):
- `pnpm tsc --noEmit` → `tsc --noEmit` (runs via build)
- `pnpm lint` → **remove** (no lint script)
- `pnpm test` → `bun run backend` (only backend tests)
- `pnpm build` → `bun run build`

**REVIEW_CHECKLIST.md** (line 13):
- "All CI gates pass (typecheck, lint, test, build)" → "All CI gates pass (typecheck via build, backend tests, build)"

**CODE_QUALITY_PRINCIPLES.md** (line 57):
- "Linting rules (ESLint config)" → **remove**

**CODE_QUALITY_QUICK_REF.md** (line 71):
- "Bundle size CI gate" → "Bundle size via `bun run build`"

### Validation
- Run `bun run validate` to verify feature validation works
- Run `bun run build` to verify build works
- Run `bun run backend` to verify backend tests work
- All script references in docs match package.json exactly