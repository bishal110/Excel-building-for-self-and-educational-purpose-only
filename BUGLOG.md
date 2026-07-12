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

## Phase 5 — Shell, Help audit & persistence

No product bugs found. Notable safety additions:
- The Sheets key handler was refactored to share one source of truth (`SHORTCUTS`)
  with the Help panel's registry (`KEYBINDINGS`). A new audit test
  (`keybindings.audit.test.ts`) — wired into `npm run build` — **fails the build**
  if Help and the handler diverge, satisfying the Phase-5 requirement that Help
  list ONLY implemented shortcuts.
- Whole-suite `.aioffice` save/open is covered by a round-trip unit test.
- A responsive E2E audit asserts no horizontal page overflow at 360/768/1366px
  across all three modules; the existing layout passed with no changes needed.

## Phase 6 — Packaging

### BUG-010 — `import.meta.env` failed the type-check
- **Symptom**: `npm run build` failed with TS2339 (`Property 'env' does not
  exist on type 'ImportMeta'`) after adding the service-worker registration.
- **Root cause**: `tsconfig.json` listed explicit `types`, which suppresses
  automatic inclusion of Vite's client type definitions.
- **Fix**: Added `"vite/client"` to the `types` array.
- **Test**: Guarded by `npm run build` (tsc runs first).

### NOTE — Electron binaries unreachable from the build environment
- `npm install electron` fails here with HTTP 403: the environment's network
  policy blocks Electron's GitHub-release binary download. Not a product bug and
  not fixable in-container. Electron is installed with
  `ELECTRON_SKIP_BINARY_DOWNLOAD=1` so the dependency entry is correct for
  Windows machines; `BUILD_ON_WINDOWS.md` documents the two-command build.
- Verified in-container instead: `dist/` build, LAN serve script, the standalone
  `AI_Office.html` over `file://` (formula `=21*2` → 42, all modules render,
  zero page errors), and the PWA (manifest valid, service worker `activated`,
  offline reload + formula evaluation with the network off).

## Phase 7 — Adversarial audit

Clean-checkout rerun (fresh clone → install → 253 unit + 17 E2E + both builds)
passed before any new work. The stale-state hunt and keyboard-only walkthrough
then found three real bugs — all fixed with regression tests:

### BUG-011 — Deep formula chains crashed to `#VALUE!` (stack overflow)
- **Symptom**: A 1,000-row running-total column (`A2=A1+1`, filled down)
  returned `#VALUE!` instead of the value — exactly the shape of daily
  well-data cumulative columns.
- **Root cause**: The evaluator recursed once per dependency link
  (`evalCell → evaluate → getValue → evalCell…`), overflowing the JS call
  stack; the catch-all converted the `RangeError` into `#VALUE!`.
- **Fix**: Rewrote `Sheet` evaluation as an iterative, explicit-stack
  topological pass: static dependencies are extracted from the AST and computed
  before their dependents, so chain depth no longer consumes call-stack frames.
  Cycles are detected as back-edges (`#CYCLE!` semantics unchanged).
- **Test**: `phase7.audit.test.ts` → "recalculates a 1,000-cell formula chain";
  all 259 existing tests (cycles, lazy IF, error propagation) still pass.

### BUG-012 — Focused toolbar buttons couldn't be activated by keyboard
- **Symptom**: Tab/focus onto any Sheets toolbar button, press Enter — the grid
  moved the active cell instead of clicking the button. Keyboard-only users
  could not operate the toolbar.
- **Root cause**: The global key handler only exempted INPUT/TEXTAREA/SELECT,
  so it hijacked Enter/Space from focused buttons and links.
- **Fix**: Buttons/links now own their activation keys (Enter, Space) while
  other keys (Ctrl+Z after a mouse click, arrows) still reach the grid.
- **Test**: `accessibility.spec.ts` → "modals are keyboard-dismissable…".

### BUG-013 — Type-to-edit silently dropped the first character
- **Symptom**: With a cell selected, typing `=A1*8` produced the text `A1*8` —
  the leading `=` vanished, turning a formula into a string with no error.
- **Root cause**: The cell editor `select()`ed its initial content on mount, so
  the second keystroke replaced the just-typed first character.
- **Fix**: Type-to-edit now places the caret at the end; select-all-on-open is
  kept for F2/double-click (where overwrite is the expected behaviour).
- **Test**: `accessibility.spec.ts` → "keyboard-only: navigate, type, formula…".

Also added: a visible `:focus-visible` indicator on the grid container,
10k-cell fill + `SUM` performance test (both well under their ceilings), undo
across sheet switches, per-sheet formula isolation, and cross-viewport
screenshots at 360/768/1366 px (0 px horizontal overflow at all three).

## Security pass (post-Phase 7)

### HARDENING-001 — user-supplied URLs were rendered unsanitized
- **Symptom (potential)**: A shared `.aioffice` file or pasted URL could set a
  slide image or document image/link to `javascript:`/`data:text/html`
  content. Modern browsers block script execution in `img src`, but the URLs
  flowed into the DOM unvalidated — a weak link for future features.
- **Fix**: Added `src/ui/security.ts` (`sanitizeImageUrl`, `sanitizeLinkUrl`,
  unit-tested) and applied it at every user-URL entry point: slide image
  rendering, Docs insert-image, Docs insert-link. Only `http(s)`, `mailto`,
  and `data:image/*` pass.
- **Test**: `ui/security.test.ts` (7 cases incl. case-mangled `jAvAsCrIpT:`).
- The full threat model now lives in `docs/SECURITY.md`.

## Field report (Windows desktop build)

### BUG-014 — file import couldn't open/detect files (found on real Windows Electron build)
- **Symptom**: In the packaged Windows app, "Import CSV" / "Import xlsx" /
  "Open project" failed to detect files — the OS dialog either didn't open or
  a selected file never loaded.
- **Root cause**: `pickFile()` created an `<input type="file">` but **never
  attached it to the document** before calling `.click()`. A detached file
  input is unreliable in packaged Electron (and some browsers): the native
  dialog may not open and the `change` event may not fire. (The sibling
  `downloadBlob` correctly appended its element — the picker didn't.)
  Secondary cause: file-type filters were too narrow (`.xlsx` only), greying
  out valid `.xls`/`.csv`/`.txt` files in the Windows dialog.
- **Fix**: `pickFile()` now appends the input to `document.body` (hidden),
  listens for both `change` and `cancel`, and cleans up afterward. Import
  filters broadened (`.csv/.txt/.tsv`, `.xlsx/.xls/.xlsm`, `.aioffice/.json`)
  and each importer wrapped in a try/catch with a clear error message.
- **Test**: `e2e/sheets.spec.ts` → "import a real CSV file populates the grid"
  feeds an actual CSV through the file chooser and asserts the cells fill.

### NOTE — electron-builder "author is missed in package.json"
- A cosmetic warning during `npm run dist:win-*`. Added an `author` field to
  `package.json`; the warning is gone and it populates the exe's metadata.
