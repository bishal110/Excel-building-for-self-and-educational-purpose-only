# Contributing to AI_Office

Thanks for your interest! This is a personal, educational project, but clear
contribution notes keep it easy to work in.

## Getting set up

```bash
npm install
npm run dev
```

## Ground rules (kept from day one)

1. **Test-driven for engine logic.** Anything in `src/engine` and `src/io` and
   `src/ui/state` must have unit tests. Write the failing test first, then the
   code. No change lands with a red test.
2. **Keep the engine framework-agnostic.** Nothing in `src/engine` may import
   React. The engine is pure TypeScript so it stays testable and reusable.
3. **Excel-parity is intentional.** Behaviours like `-2^2 = 4` and error
   propagation through ranges are deliberate — don't "fix" them.
4. **Be honest about scope.** If something is cut or simplified, record it in
   `KNOWN_LIMITS.md`. Every bug found goes in `BUGLOG.md` (symptom, root cause,
   fix, test added).

## Before you open a pull request

```bash
npm run lint      # tsc type-check — must be clean
npm test          # unit tests — must be green
npm run e2e       # end-to-end tests (needs browsers: npm run e2e:install)
npm run build     # production build must succeed
```

## Commit style

Use clear, conventional-ish messages, e.g.:

```
feat(engine): add STDEV/VAR functions
fix(grid): keep styles aligned when inserting a row
docs: expand macro API examples
```

Small, focused commits are easier to review than one large one.
