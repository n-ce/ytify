# Code Quality Standards

## Core Principles (from CODE_QUALITY_PRINCIPLES.md)

### 1. Concise, Precise Code
- **Clarity over cleverness**: Code should be immediately understandable
- **Explicit over implicit**: Prefer obvious code over "magic" patterns
- **Minimal boilerplate**: Avoid ceremony without semantic value
- **Single responsibility**: Each function/module has one clear purpose

### 2. Balanced DRY
- **Pragmatic duplication > forced abstraction**: Accept reasonable duplication when abstraction increases cognitive load
- Only abstract when shared logic is *identical in intent*, not just structure
- Prefer copying 2-3 times over premature abstractions
- **Abstraction criteria**: Same business logic, changes affect all consumers same way, clear name, consumers don't need implementation details

### 3. Explicit Over Implicit
- **No hidden side effects**: Functions do what their name suggests
- **Visible data flow**: Pass dependencies explicitly over global state
- **Clear ownership**: Each state piece has obvious owner
- **Predictable behavior**: Same inputs → same outputs

### 4. Practical Performance
- **Measure before optimizing**: Profile real bottlenecks
- **Bundle size awareness**: < 200KB gzipped
- **Lazy loading by default**: All features on demand
- **Efficient reactivity**: Minimize unnecessary signal subscriptions

### 5. Type Safety as Documentation
- **Types as contracts**: Signatures communicate intent
- **No `any` without justification**: Every `any` needs comment
- **Discriminated unions**: For state machines/variants
- **Branded types**: For domain primitives (UserId, TrackId)

### 6. Testability by Design
- **Pure functions by default**: Side effects at boundaries
- **Dependency injection**: External services passed in
- **Deterministic behavior**: Same inputs → same outputs
- **Fast tests**: Unit tests in milliseconds

---

## Quick Reference Card (from CODE_QUALITY_QUICK_REF.md)

### Decision Hierarchy
**1. Correctness → 2. Clarity → 3. Testability → 4. DRY**

### DRY Decision Tree
```
Is the logic IDENTICAL in intent (not just structure)?
├── NO → Duplicate the code (2-3x is fine)
└── YES → Will changes affect all consumers the SAME way?
    ├── NO → Duplicate the code
    └── YES → Can you name the abstraction clearly in 1-2 words?
        ├── NO → Duplicate the code
        └── YES → Extract with clear name, explicit params
```

### Anti-Pattern Quick Checks

| Pattern | Fix |
|---------|-----|
| `any` type | Add proper type or `// justify: reason` |
| Magic number/string | `const MEANINGFUL_NAME = value` |
| Global import in function | Pass as parameter |
| 3+ boolean params | Options object or builder |
| Function > 30 lines | Extract pure sub-functions |
| Nested ternary | Early returns or switch |
| Implicit side effect | Make return value explicit |

### Naming Conventions

| Concept | Convention |
|---------|------------|
| Functions | `verbNoun` (`playTrack`, `saveConfig`) |
| Booleans | `is/has/should/can` (`isPlaying`, `hasLyrics`) |
| Constants | `SCREAMING_SNAKE` (`MAX_PLAYLIST_SIZE`) |
| Types/Interfaces | `PascalCase` (`Track`, `PlaybackState`) |
| Signals/Stores | `noun` + `Signal`/`Store` (`volumeSignal`) |
| Events | `onVerbNoun` (`onTrackChange`) |

### SolidJS Specific

**Do:**
- `createSignal` for independent values
- `createStore` for related object state
- `createMemo` for derived calculations
- `onMount`/`onCleanup` for side effects
- Lazy components: `lazy(() => import('./Feature'))`

**Don't:**
- `createSignal` for objects (use `createStore`)
- Signals in loops (create outside, update inside)
- Missing dependency arrays in memos
- Direct DOM manipulation (use refs)

### TypeScript Patterns

```typescript
// Branded types
type UserId = string & { __brand: 'UserId' }
const UserId = (s: string) => s as UserId

// Discriminated union
type Result<T> = 
  | { ok: true; value: T }
  | { ok: false; error: Error }

// Strict config
interface Config {
  readonly theme: 'auto' | 'light' | 'dark'
  readonly panelRatio: PanelRatio
}
```

### Review Phrases

**Blocking:**
- "This abstraction increases cognitive load without reducing duplication"
- "Hidden dependency on `X` makes this untestable"
- "`any` type loses compile-time safety - what's the real type?"

**Non-blocking:**
- "Consider inlining this helper - only used once"
- "Could rename `handleX` to `processX` for consistency"
- "Extract constant for magic number `42`"

### Bundle Size Guardrails
- New dependency: < 5KB gzipped unless justified
- Feature chunk: < 30KB gzipped
- Total: < 200KB gzipped (via `bun run build`)

### Emergency Override
When deadlines demand pragmatism:
1. Add `// TECH_DEBT: reason` comment
2. Create follow-up issue
3. Never ship `any` without justification comment

---

## Enforcement
- Code review checklist (see `docs/standards/review-checklist.md`)
- TypeScript strict mode
- Bundle size via `bun run build`
- Architectural decision records for major abstractions

## Related Documents
- `docs/systems/` - Per-subsystem specifications and requirements
- `docs/standards/review-checklist.md` - Code review checklist
- `docs/plans/active/` - In-flight implementation plans
- `AGENTS.md` - Agent invariants and definition of done
