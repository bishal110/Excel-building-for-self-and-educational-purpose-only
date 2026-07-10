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

## Phase 2 — Sheets UI

### BUG-004 — `noUnusedLocals` flagged dead symbols
- **Symptom**: `npm run build` (which now runs `tsc`) failed: `numArg` imported
  but unused in `stats.ts`, and `meta` declared but unused in `Grid.tsx`.
- **Root cause**: The app's stricter `tsconfig` (`noUnusedLocals` /
  `noUnusedParameters`) surfaced two leftover symbols that the engine's original,
  looser config did not.
- **Fix**: Removed the unused import and local.
- **Test**: Guarded by `npm run lint` / `npm run build`.

### BUG-005 — AutoSum test asserted an impossible range
- **Symptom**: A store unit test expected `AutoSum` in A5 to produce
  `=SUM(A1:A4)`, but A4 held text.
- **Root cause**: The test, not the code — `autoSum` correctly stops the
  contiguous-number scan at the first non-number (A4 = "text"), so no sum was
  produced. The assertion was wrong.
- **Fix**: Rewrote the test to use a clean numeric column; confirmed `autoSum`
  produces `=SUM(C1:C3)` and evaluates to 60.
- **Test**: `ui/state/store.test.ts` → "autoSum inserts a SUM formula …".

### NOTE — Playwright browser version
- The environment ships Chromium build 1194 while the installed `@playwright/test`
  expects a newer build. Not a product bug: `playwright.config.ts` launches the
  on-disk Chromium directly via `executablePath`, so E2E runs without a download.

### BUG-006 — Freeze button did nothing (found in self-audit)
- **Symptom**: The Freeze toolbar button toggled `frozenRows`/`frozenCols` in the
  store, but scrolling did not keep any row or column pinned.
- **Root cause**: `Grid.tsx` never read `frozenRows`/`frozenCols`, so the state
  had no rendering effect — a gap between the claimed feature and reality.
- **Fix**: Reworked the grid to position cells/headers with explicit
  scroll-offset math and pin frozen rows/columns (Excel-like). Frozen rows are
  always rendered even when scrolled out of the virtualization window.
- **Test**: `e2e/sheets.spec.ts` → "freeze keeps the header row visible while
  scrolling".

## Phase 3 — Docs UI

### BUG-007 — Missing `@tiptap/extension-image` broke the type-check/build
- **Symptom**: `tsc` failed — `Cannot find module '@tiptap/extension-image'` and
  `setImage` missing from the command chain.
- **Root cause**: The image extension was used but not added to `package.json`.
- **Fix**: Installed `@tiptap/extension-image`; the command types then register.
- **Test**: Guarded by `npm run build` (tsc) and `e2e/docs.spec.ts`.

### BUG-008 — Doc-model test failed strict index/undefined checks
- **Symptom**: `tsc` errors: `blocks[1]` possibly undefined and union not narrowed.
- **Root cause**: `noUncheckedIndexedAccess` makes array access possibly-undefined,
  which blocked discriminated-union narrowing.
- **Fix**: Asserted the indexed access (`blocks[1]!`) before narrowing on `kind`.
- **Test**: `io/docModel.test.ts`.

## Audit (Phases 1–3, before Phase 4)

Full pass over every toolbar/ribbon option, tab, and feature: 23 store audit
tests, 7 edge-case safety tests, an `.xlsx` round-trip test, and two Playwright
click-through audits that fail on any uncaught runtime error. One real bug found.

### BUG-009 — `.xlsx` export silently dropped formulas
- **Symptom**: Exporting to `.xlsx` and reading the file back returned empty cells
  where formulas had been (e.g. `=B2*2` came back as `""`).
- **Root cause**: `writeXlsx` wrote formula cells as `{ t:'n', f:'…' }` with no
  cached value. SheetJS drops a formula cell that has no `v`.
- **Fix**: Write formula cells as `{ t:'n', f:'…', v:0 }`; readers use `f` and
  ignore the placeholder value.
- **Test**: `io/xlsx.test.ts` → "xlsx round-trip preserves … formulas".

Everything else audited (number formats, sort, insert/delete row & column,
find & replace, freeze, charts, macros, sheet add/rename/delete, project
save/load, copy/paste at grid edges, macro on empty sheet, circular refs after
row delete, and every Docs ribbon control) passed with no runtime errors.

## Phase 4 — Slides UI

No product bugs found during the build. The slide deck store has 9 unit tests
(add/duplicate/delete/reorder/navigate/theme), 3 E2E tests (create → reorder →
present → exit, layout/theme, delete-keeps-one), and a click-through audit that
exercises every slide control (layouts, themes, present, export, reorder) with
zero uncaught runtime errors.
