# 🚀 Deployment Guide - music.ml4-lab.com

> **Simple, one-command deployment for your premium music dashboard.**

---

## ⚡ Quick Deploy (TL;DR)

```bash
npm run ship
```

That's it! The script handles everything automatically. ✨

---

## 📖 What Happens?

When you run `npm run ship`, the script:

1. **✅ Verifies** - Runs `npm run build` to ensure everything compiles
2. **📦 Asks for version** - Patch, Minor, or Major bump
3. **📝 Updates** - Modifies `package.json` with new version
4. **🏷️ Tags** - Creates Git commit and tag (e.g., `v8.3.0`)
5. **⬆️ Pushes** - Sends everything to GitHub

**Your changes go live automatically** when pushed to the `main` branch.

---

## 🎯 Version Bump Guide

| Type      | When to Use                    | Example         |
| --------- | ------------------------------ | --------------- |
| **Patch** | Bug fixes, typos, small tweaks | `8.2.1 → 8.2.2` |
| **Minor** | New features, UI changes       | `8.2.1 → 8.3.0` |
| **Major** | Breaking changes, redesigns    | `8.2.1 → 9.0.0` |

---

## 🛠️ Manual Deployment (If Needed)

If you prefer doing it manually:

```bash
# 1. Build
npm run build

# 2. Update version in package.json manually
# (change "version": "8.2.1" to "8.2.2")

# 3. Commit and tag
git add .
git commit -m "chore: bump version to 8.2.2"
git tag -a v8.2.2 -m "Release v8.2.2"

# 4. Push
git push
git push --tags
```

---

## ❓ Troubleshooting

### "Build failed"

- Check the error message from `npm run build`
- Fix TypeScript/compilation errors first
- Run `npm run dev` to test locally

### "Uncommitted changes"

The script will warn you if you have uncommitted changes. You can:

- Commit them first: `git add . && git commit -m "your message"`
- Or continue anyway (not recommended)

### "Push rejected"

- Make sure you have push access to the repository
- Pull latest changes: `git pull`
- Try again

---

## 🎉 That's All!

For most workflows, just remember:

```bash
npm run ship
```

**Happy shipping!** 🚢
