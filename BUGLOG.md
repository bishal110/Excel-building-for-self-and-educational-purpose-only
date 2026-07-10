# BUGLOG — AI_Office

Every bug found (by tests, lint, type-checker, or self-review) is logged here:
symptom, root cause, fix, and the test that guards it.

## Phase 1 — Engine

### BUG-001 — `LOG10(...)` evaluated to `#VALUE!`
- **Symptom**: `=LOG10(1000)` returned `#VALUE!` instead of `3`.
- **Root cause**: The tokenizer's cell-reference pattern `^\$?[A-Z]+\$?\d+$` also
  matches identifiers like `LOG10` (column `LOG`, row `10`), so `LOG10` was lexed
  as a cell reference; the following `(` then failed to parse.
- **Fix**: Added lookahead in `tokenizer.ts` — an identifier immediately followed
  by `(` (ignoring spaces) is always emitted as a function name, even if it
  otherwise matches the cell-ref pattern.
- **Test**: `functions.math.test.ts` → "POWER and LOG family".

### BUG-002 — `TRUE()` / `FALSE()` evaluated to `#VALUE!`
- **Symptom**: `=TRUE()` and `=FALSE()` returned `#VALUE!`.
- **Root cause**: `TRUE`/`FALSE` were lexed as boolean literals, so the trailing
  `()` was an unexpected token and the parse failed.
- **Fix**: Same lookahead as BUG-001 — when `TRUE`/`FALSE` are followed by `(`
  they are treated as function names; bare `TRUE`/`FALSE` remain boolean literals.
- **Test**: `functions.logical.test.ts` → "TRUE() and FALSE()".

### BUG-003 — Type error: blank-coercion widened comparison operands
- **Symptom**: `tsc --noEmit` failed in `evaluator.ts` — `CellValue` (which
  includes `CellError`) was not assignable to the error-narrowed operand type.
- **Root cause**: After the early `isError` guard, comparison operands are
  narrowed to `number|string|boolean|null`, but `blankAs()` was typed to return
  the full `CellValue` union.
- **Fix**: Narrowed `blankAs()`'s return type to `number|string|boolean|null`
  (it never returns an error).
- **Test**: Guarded by `npm run lint` (tsc) in CI; no runtime test needed.
