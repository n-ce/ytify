# Code Review Checklist

## Purpose
Operationalize CODE_QUALITY.md into actionable review criteria.

## Pre-Review (Author)
- [ ] Self-reviewed against this checklist
- [ ] All CI gates pass (typecheck, backend tests, build)
- [ ] Bundle size impact assessed (<200KB gzipped)
- [ ] Manual testing: mobile, offline, accessibility

## Code Quality (Reviewer)

### Concise & Precise
- [ ] No unnecessary abstraction layers
- [ ] Function names describe *what*, not *how*
- [ ] Single responsibility per function/module
- [ ] No commented-out code or dead code
- [ ] Cyclomatic complexity < 10 per function

### Balanced DRY
- [ ] Duplication accepted where abstraction would obscure intent
- [ ] Shared logic extracted only when identical in *intent*
- [ ] No "utility" functions used in only 1-2 places
- [ ] Abstractions have clear, single-purpose names

### Explicit Over Implicit
- [ ] No hidden side effects in pure-looking functions
- [ ] Dependencies passed explicitly (DI), not imported globally
- [ ] State ownership clear (who mutates, who reads)
- [ ] No magic strings/numbers - use constants/enums
- [ ] Async boundaries explicit (no hidden promises)

### Type Safety
- [ ] No `any` without `// @ts-expect-error` + justification comment
- [ ] Discriminated unions for variant handling
- [ ] Branded types for domain primitives
- [ ] Strict null checks - no silent undefined handling
- [ ] Generic constraints used appropriately

### Testability
- [ ] Pure functions exported for unit testing
- [ ] Side effects isolated at boundaries (services, stores)
- [ ] External dependencies injectable (not hardcoded imports)
- [ ] Deterministic behavior - no flaky test patterns
- [ ] Test coverage ≥ 80% for new code

## Architecture Alignment
- [ ] Follows feature-based organization (src/features/, src/lib/modules/)
- [ ] Uses SolidJS signals/stores reactively
- [ ] Lazy loading for new features (solid-js/lazy)
- [ ] localStorage namespaced correctly (library_, config, drawer)
- [ ] CSS custom properties for theming
- [ ] No external UI library dependencies added

## Performance
- [ ] No unnecessary re-renders (proper signal usage)
- [ ] Large dependencies lazy-loaded
- [ ] Images optimized (WebP, proper sizing)
- [ ] No blocking main thread operations > 16ms

## Security & Privacy
- [ ] No tracking/analytics code
- [ ] No external network requests without user action
- [ ] SHA-256 for auth, no raw credentials stored
- [ ] CSP headers respected

## Documentation
- [ ] Complex logic has inline comments explaining *why*
- [ ] Public APIs have JSDoc/TSDoc
- [ ] Breaking changes have migration notes
- [ ] Spec completeness criteria updated (`docs/systems/*.md`)

## Post-Review
- [ ] Author addresses all blocking comments
- [ ] Non-blocking suggestions acknowledged or deferred with reason
- [ ] Completeness criteria updated in the affected `docs/systems/*.md`
- [ ] Related specs updated for cross-cutting changes

## Quick Reference: When to Push Back

| Pattern | Response |
|---------|----------|
| "Let's make this generic" | "Show me 3+ identical use cases first" |
| "I'll add a helper for this" | "Is it used elsewhere? Can we inline?" |
| "This abstracts the pattern" | "Does it reduce cognitive load or increase it?" |
| "Any type here" | "What's the actual type? Can we constrain it?" |
| "Global store for this" | "Can we pass it as a prop/dependency?" |