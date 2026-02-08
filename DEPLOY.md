# Deployment Guide - music.ml4-lab.com

> **Automated pipeline with intelligent versioning for ML4-Lab ytify fork.**

---

## Quick Commands

| Command | Description |
|---------|-------------|
| `npm run ship` | Deploy new version (build + version + tag + push) |
| `npm run sync` | Sync with upstream (n-ce/ytify) |
| `npm run dev` | Start development server |
| `npm run build` | Build production |
| `npm run typecheck` | Run TypeScript type check |

---

## Versioning Strategy

**Format:** `UPSTREAM_VERSION-ml4.PATCH`

| Version | Meaning |
|---------|---------|
| `8.2.1-ml4.0` | First sync with upstream v8.2.1 |
| `8.2.1-ml4.1` | ML4-Lab bug fix |
| `8.2.1-ml4.2` | ML4-Lab feature |
| `8.2.2-ml4.0` | Synced with upstream v8.2.2 |

This format clearly distinguishes ML4-Lab releases from upstream versions.

---

## Shipping (Deployment)

```bash
npm run ship
```

The script handles everything:

1. **Verifies** - Checks for uncommitted changes
2. **Builds** - Runs `npm run build` to ensure compilation
3. **Versions** - Offers bump options:
   - ML4 Patch (8.2.1-ml4.0 -> 8.2.1-ml4.1)
   - Sync with upstream (if newer version available)
   - Patch/Minor/Major bumps
4. **Tags** - Creates git commit and tag
5. **Pushes** - Sends to GitHub

**Your changes go live automatically** when pushed.

---

## Syncing with Upstream

### Automatic (GitHub Actions)

A workflow runs daily at 03:00 UTC to check for upstream changes:
- If changes found with no conflicts: Creates auto-mergeable PR
- If conflicts detected: Creates PR with conflict markers for manual review

### Manual (Local)

```bash
npm run sync
```

The sync script:
1. Stashes your uncommitted changes
2. Fetches upstream (origin/main)
3. Checks for conflicts
4. Merges if you confirm
5. Verifies build passes
6. Restores your stashed changes

**Protected ML4-Lab files** (keep our version on conflict):
- `src/styles/tokens.css`
- `src/components/NavBar.*`
- `src/components/StreamItem.*`
- `src/features/Player/*`
- `scripts/ship.js`, `scripts/sync.js`

---

## CI/CD Pipeline

### Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Push/PR to master | Build validation, TypeScript check |
| `upstream-sync.yml` | Daily 03:00 UTC | Auto-sync with upstream |
| `release.yml` | Version tags (v*) | Create GitHub releases |

### Branch Strategy

```
origin (n-ce/ytify)
  main (upstream production)

fork (Anarqis/ytify)
  master (ML4-Lab production) <- auto-deploys to Netlify
  sync/* (temporary sync branches)
```

---

## Troubleshooting

### "Build failed"

```bash
npm run typecheck   # Check for TypeScript errors
npm run dev         # Test locally
```

### "Merge conflicts"

1. Open conflicting files
2. Look for `<<<<<<<` markers
3. For ML4-Lab protected files, keep our version
4. `git add <files>` then `git commit`

### "Push rejected"

```bash
git pull            # Get latest changes
npm run ship        # Try again
```

### "Sync failed"

```bash
git merge --abort   # Cancel merge
git stash pop       # Restore your changes
```

---

## Manual Deployment

If you prefer doing it manually:

```bash
# 1. Build
npm run build

# 2. Update version in package.json
# e.g., "version": "8.2.1-ml4.1"

# 3. Commit and tag
git add .
git commit -m "chore: release v8.2.1-ml4.1"
git tag -a v8.2.1-ml4.1 -m "Release v8.2.1-ml4.1"

# 4. Push
git push
git push --tags
```

---

## Links

- **Production:** https://music.ml4-lab.com/
- **GitHub Fork:** https://github.com/Anarqis/ytify
- **Upstream:** https://github.com/n-ce/ytify
