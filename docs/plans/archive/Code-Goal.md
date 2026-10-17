---
name: codebase-purifier
description: Audit and purify a codebase end to end - remove dead code and unused dependencies, eliminate duplication, cut complexity, fix performance hotspots, shrink code and bundle size, harden types and error handling, and enforce consistent style, all without changing behavior. Use this skill whenever the user mentions cleaning up, purifying, refactoring, optimizing, slimming down, de-bloating, modernizing, or improving the quality, performance, size, or maintainability of a repo, folder, or module, even if they only say "make this code better", "this project is a mess", "reduce the size", or "review my whole codebase". Also use it before a release, after a rapid prototype or AI-generated code dump, or when onboarding to a legacy project.
---

# Codebase Purifier

Turn a messy, bloated, or slow codebase into a lean, fast, readable one while keeping its behavior identical. Purification is subtractive first: the best line of code is the one you can delete. Improvement comes second, and new features never.

## Core principles

These exist because purification fails in predictable ways. Each rule prevents one.

1. **Behavior is sacred.** A "cleaner" codebase that breaks things is worse than the original. Prove behavior is preserved with tests, type checks, builds, or before/after output comparison.
2. **Measure, then change.** Gut-feel optimization produces churn. Record baselines (LOC, bundle size, dependency count, test time, benchmark numbers, lint/type errors) before touching anything, and report deltas at the end.
3. **Small, reversible steps.** One concern per change. If something breaks, you must know which change caused it. Commit or checkpoint after each verified step.
4. **Delete before you refactor, refactor before you optimize.** Removing dead code shrinks the surface you need to reason about. Premature optimization of code that should have been deleted is wasted work.
5. **Respect the project's conventions.** Match the existing formatter, lint config, naming, and architecture unless the user asks to change them. Do not impose personal taste.
6. **Ask before risky or public-facing changes.** Public APIs, database migrations, config formats, and anything consumed by outside code need explicit user approval.

## Workflow

### Phase 0 - Scope and safety net

1. Clarify scope if unclear: whole repo, one package, or one directory? Any off-limits areas (vendored code, generated files, legacy modules)? Which goals matter most (speed, size, readability, all)? If the user gave no preference, do all of them in the order below.
2. Check the repo state: ensure it is under version control with a clean working tree, or create a backup/branch (`git checkout -b purify/<date>`). Never start on a dirty tree.
3. Identify the stack: languages, frameworks, package manager, build tool, test runner, linters, formatters, CI config. Read the README, package manifests, and config files first.
4. Find the verification commands (build, test, lint, typecheck). Run them now. If the suite is already failing, record the failures as the baseline so you do not take blame for them or mask them.
5. If there are no tests around code you plan to change substantially, write a few characterization tests that pin current behavior before refactoring.

### Phase 1 - Baseline and audit

Gather metrics and write them down (see `Report format`). Use whatever tools the stack offers; fall back to grep/find/wc when none are installed.

- Size: total LOC by language (`cloc`, `tokei`, or `find ... | xargs wc -l`), largest files, bundle/binary/image sizes, `node_modules`/vendor size.
- Dependencies: count, outdated, unused, duplicated versions, known vulnerabilities (`npm audit`, `pip-audit`, `cargo audit`, `govulncheck`).
- Quality: lint and type error counts, cyclomatic complexity hotspots, duplication percentage (`jscpd`, `radon`, `gocyclo`, `lizard`), test coverage.
- Performance: build time, test time, startup time, and any profiling or benchmark data that exists.
- Smells: grep for `TODO|FIXME|HACK|XXX`, commented-out code blocks, `console.log`/`print` debugging, giant functions (>50 lines), deep nesting (>3 levels), long parameter lists (>4), magic numbers, copy-pasted blocks.

Produce a short prioritized plan: findings ranked by impact divided by risk. Share it with the user before large or risky changes; proceed directly for low-risk cleanup.

### Phase 2 - Purge (reduce size and noise)

Do this first. It is the safest, highest-yield phase.

**Dead code**
- Unused files, exports, functions, classes, variables, parameters, imports, CSS rules, feature flags that are permanently on/off, unreachable branches.
- Tools: `knip`/`ts-prune`/`depcheck` (JS/TS), `vulture` (Python), `staticcheck`/`deadcode` (Go), `cargo udeps`/compiler warnings (Rust), `PurgeCSS`, IDE inspections.
- Before deleting, search for dynamic usage: reflection, string-built imports, plugin registries, route tables, serialization names, templates, config files, tests, docs, and public exports consumed by other packages. When unsure, flag it instead of deleting.
- Delete commented-out code. Version control remembers it.

**Dependencies**
- Remove unused packages. Replace heavy libraries used for one tiny function with native or in-house code (for example, a whole utility library for one `debounce`).
- Consolidate duplicate libraries that do the same job (two date libraries, two HTTP clients, two state managers).
- Dedupe lockfile versions. Move dev-only packages to dev dependencies. Prefer actively maintained packages with small footprints.
- Do not upgrade major versions as part of purification unless asked; that is a separate, riskier task.

**Assets and repo hygiene**
- Remove unused images, fonts, fixtures, and build artifacts committed by accident. Compress or convert large images (WebP/AVIF, SVGO for SVG). Subset fonts.
- Fix `.gitignore` for build output, caches, and secrets. Remove committed `.env` files, keys, and tokens from the tree and **tell the user to rotate them**, since they remain in git history.

### Phase 3 - Simplify (quality and readability)

**Duplication**
- Extract repeated logic only when it appears three or more times or when the copies must stay in sync. Two similar snippets are often better left alone; a wrong abstraction costs more than duplication.
- Prefer small pure functions and data-driven tables over copy-pasted branches.

**Complexity**
- Flatten nesting with early returns and guard clauses.
- Split functions that do more than one thing; target under ~40 lines and a single level of abstraction per function.
- Replace long `if/else` or `switch` chains with lookup maps or polymorphism when it genuinely clarifies.
- Reduce parameter lists with options objects or small value types.
- Replace flag arguments with separate functions. Replace magic numbers and strings with named constants or enums.
- Break up god files and god classes along real responsibilities. Fix circular dependencies and tangled imports.

**Naming and clarity**
- Rename for intent (`d` -> `elapsedDays`). Make booleans read as predicates (`isReady`, `hasAccess`).
- Delete comments that restate the code; keep comments that explain why. Replace stale comments or fix them.
- Keep one consistent convention for naming, file layout, and error style across the repo.

**Type and contract safety**
- Turn on or tighten strictness where feasible (`strict` in TypeScript, type hints plus `mypy`/`pyright` in Python, `clippy` in Rust). Remove `any`, unchecked casts, and blanket `# type: ignore` where the real type is knowable.
- Validate data at boundaries (user input, network, files, env vars) and trust it inside.
- Make illegal states unrepresentable where cheap: enums or unions instead of stringly typed values, immutable data by default.

**Error handling and robustness**
- No empty `catch` blocks or swallowed errors. Handle, wrap with context, or let propagate.
- Use consistent error types and messages. Make sure resources (files, sockets, locks, DB connections) are always released (`finally`, `with`, `defer`, RAII).
- Remove debugging output and replace ad-hoc prints with the project's logger at proper levels.

**Modernization (only when it simplifies)**
- Use current language features that reduce code: optional chaining, destructuring, comprehensions, pattern matching, `async/await` over callback pyramids, standard-library replacements for hand-rolled helpers. Do not bump language or runtime versions unprompted.

### Phase 4 - Optimize (performance)

Profile first. Fix the measured top offenders, not the imagined ones.

**Algorithms and data structures**
- Look for accidental O(n^2) or worse: nested loops over collections, repeated `find`/`includes` on arrays (use a Set or Map), repeated sorting, string concatenation in loops, recomputing invariants inside loops.
- Hoist work out of hot paths; memoize or cache pure expensive computations with a clear invalidation story.

**I/O and network**
- Fix N+1 queries (batch, join, or prefetch). Add missing database indexes for frequent filters and joins, verified with `EXPLAIN`.
- Parallelize independent async work; avoid awaiting sequentially in loops when order does not matter. Add pagination or streaming for large result sets.
- Add timeouts, connection pooling, compression, and HTTP caching headers where absent.

**Memory and concurrency**
- Avoid loading whole files or datasets when streaming works. Remove leaks: unremoved listeners, timers, unbounded caches, retained closures.
- Check for lock contention, blocking calls on async event loops, and unnecessary thread or process creation.

**Frontend specifics**
- Code-split and lazy-load routes and heavy components. Tree-shake by using per-function imports. Analyze the bundle (`webpack-bundle-analyzer`, `source-map-explorer`, `vite-bundle-visualizer`).
- Cut unnecessary re-renders (stable references, memoization where profiling shows a benefit, proper keys, virtualization for long lists).
- Optimize images, fonts, and critical CSS; defer non-critical scripts; avoid layout thrash.

**Build and startup**
- Enable minification, dead-code elimination, and incremental builds. Cache dependencies in CI. Trim startup work and eager imports.

### Phase 5 - Harden and tidy

- **Security basics**: parameterized queries, output escaping, no secrets in code, safe deserialization, least-privilege configs, patched vulnerable dependencies. Report anything serious you find rather than silently changing security-sensitive logic.
- **Tests**: remove dead, duplicated, or flaky tests; speed up slow ones; fill obvious gaps around code you refactored. Never delete a failing test just to go green.
- **Docs**: make the README accurate (install, run, test, build). Remove stale docs. Add short module-level notes only where the why is non-obvious.
- **Tooling**: ensure formatter, linter, and type checker are configured, run in CI, and pass. Add a pre-commit hook only if the user wants it.
- **Run the formatter last** so style churn does not hide meaningful diffs. If the formatter would touch many files, do it as its own separate commit.

### Phase 6 - Verify and report

1. Re-run build, lint, typecheck, and full tests. Compare against the Phase 0 baseline. Anything newly failing is your responsibility; fix or revert.
2. Re-measure every baseline metric and compute deltas.
3. Smoke-test critical paths manually or via scripts when automated coverage is thin.
4. Deliver the report below. Be honest about what you did not verify.

## Safe change protocol

For each individual change:

1. State what and why in one line.
2. Make the minimal edit.
3. Run the fastest relevant check (type check, unit tests for that module).
4. If green, checkpoint (commit with a clear message such as `refactor(auth): flatten token validation`). If red, revert that one step and reassess.

Use separate commits per category (dead code, dependencies, refactors, perf, formatting) so the user can review or revert them independently.

## Things not to do

- Do not change public APIs, schemas, CLI flags, file formats, or log formats without approval.
- Do not delete code solely because static analysis says it is unused; confirm no dynamic, reflective, or external consumers.
- Do not rewrite working modules from scratch to satisfy taste. Incremental refactor beats a rewrite.
- Do not micro-optimize cold paths or trade clarity for tiny gains with no measurement.
- Do not mix feature work, dependency major-upgrades, and cleanup in the same change.
- Do not touch generated, vendored, or minified files; fix the generator or config instead.
- Do not claim improvements you did not measure.

## Judgment calls

- **Readability vs size**: smaller is not always better. Never golf code. Prefer fewer concepts and fewer lines only when readability holds or improves.
- **DRY vs clarity**: prefer a little duplication over a confusing abstraction.
- **Perf vs maintainability**: optimize hot paths aggressively, document why, and leave everything else simple.
- **Unsure about intent**: leave the code, add a note in the report, and ask.

## Report format

Always finish with this structure:

```markdown
# Purification Report

## Summary
2-4 sentences: overall state before, what changed, current state.

## Metrics (before -> after)
| Metric | Before | After | Delta |
|---|---|---|---|
| Total LOC | | | |
| Files | | | |
| Dependencies (prod/dev) | | | |
| Bundle / artifact size | | | |
| Lint + type errors | | | |
| Duplication % | | | |
| Test count / pass rate / coverage | | | |
| Build time / test time | | | |
| Key benchmark or page-load numbers | | | |

## Changes made
Grouped by: Dead code removed - Dependencies - Simplification - Performance - Safety/Types - Tooling/Docs.

## Verification
Commands run and their results. Anything not verified and why.

## Flagged, not changed
Risky or ambiguous items needing a human decision (public API changes, suspected dead code with dynamic usage, security findings, secrets to rotate).

## Recommended next steps
Prioritized follow-ups (major upgrades, test gaps, architecture issues).
```

## Quick mode

If the user wants a fast pass, run only: baseline -> Phase 2 (dead code and unused dependencies) -> formatter/lint autofix -> verify -> short report. Say clearly that a deeper pass (Phases 3 to 5) is available.

## Stack hints

Pick the tools that fit; install them only if the environment allows, otherwise use grep-based approximations.

| Stack | Dead code / deps | Complexity / dup | Types / lint | Perf |
|---|---|---|---|---|
| JS/TS | knip, depcheck, ts-prune | jscpd, eslint complexity | tsc --strict, eslint, prettier | bundle analyzers, Lighthouse, clinic.js |
| Python | vulture, deptry | radon, jscpd | ruff, mypy/pyright, black | cProfile, py-spy, scalene |
| Go | staticcheck, deadcode, `go mod tidy` | gocyclo, dupl | go vet, golangci-lint | pprof, benchmarks |
| Rust | cargo-udeps, cargo-machete | tokei | clippy, rustfmt | cargo flamegraph, criterion |
| Java/Kotlin | IDE inspections, jdeps | PMD, detekt | SpotBugs, ktlint | JFR, async-profiler |
| CSS/Assets | PurgeCSS, unused-files tools | - | stylelint | SVGO, image compressors |
