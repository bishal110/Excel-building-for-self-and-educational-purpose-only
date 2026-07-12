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

## Excel-parity UI overhaul (post-field-report)

### BUG-015 — File → Open didn't recognize Excel/CSV files from the PC
- **Symptom (field report)**: "the open tab doesnt seem to recognise the excel
  file in my pc." A `.xlsx` chosen in the OS dialog did nothing.
- **Root cause**: The old Open path assumed one project format and only knew
  how to parse `.aioffice`/JSON. A real workbook or `.csv` fell through and
  was silently ignored.
- **Fix**: `FileMenu.openFile()` now branches on the file extension —
  `.aioffice`/`.json` → import the whole suite; `.xlsx`/`.xls`/`.xlsm` →
  switch to Sheets and load via `readXlsx`; `.csv`/`.txt`/`.tsv` → switch to
  Sheets and load via `parseCsv`. Each branch is wrapped in try/catch with a
  clear message; an empty workbook is reported rather than opening a blank
  grid.
- **Test**: `e2e/sheets.spec.ts` → "import a real CSV file populates the grid"
  now drives File → Open (not a standalone Import button).

### FEATURE — PivotTable + Excel-style ribbon tabs
- **Field report**: "i cannot find pivot table function, charts function …
  the actual tools for data analysis are missing … include useful tabs like
  it is there in original excel."
- **Change**:
  - New pure aggregation engine `src/engine/grid/pivot.ts` (`pivotGrid`) —
    group by a row field (and optional column field), aggregate a value field
    (sum/count/avg/min/max), with grand totals. Unit-tested
    (`src/engine/pivot.test.ts`, 6 cases).
  - `PivotBuilder` modal + `store.createPivotSheet()` emit the result as a
    new bold-headed sheet.
  - The flat toolbar is replaced by a tabbed **ribbon** (`SheetsRibbon`):
    **Home** (font/align/number/clipboard/cells/editing), **Insert**
    (PivotTable, Chart), **Data** (sort, find & replace, PivotTable, Chart),
    **View** (freeze, macros, help). Chart and PivotTable are now discoverable
    under Insert/Data instead of buried in an overloaded toolbar.
  - The standalone Import/Export buttons are gone; those actions live in
    File → Open and File → Save As (project / .xlsx / .csv).
- **Test**: `e2e/sheets.spec.ts` → "PivotTable summarizes a selection into a
  new sheet"; `e2e/audit.spec.ts` navigates every ribbon tab and clicks every
  control with zero runtime errors.

### BUG-016 — File → Open merged onto the current sheet (stale cells, silent overwrite)
- **Symptom**: Opening a file wrote its cells over the active sheet without
  clearing it first. Opening a small file after a large one left the large
  file's tail cells behind (a confusing merge); opening any file silently
  overwrote whatever was already on that sheet, with no way to keep both.
- **Root cause**: `FileMenu` called `store.importRows()`, a raw
  write-at-offset primitive with no notion of "replace" — it never cleared the
  target and never protected existing data.
- **Fix**: New `store.openRows(rows, fileName)` with true Open semantics —
  load into the active sheet **only when it is empty** (and rename it after the
  file), otherwise load into a **fresh sheet named after the file**. It never
  merges over existing cells and never discards them, so a second Open can't
  destroy the first file. Sheet names are derived safely (`sheetNameFromFile`:
  strips the extension and Excel's illegal `: \ / ? * [ ]`, caps at 31 chars)
  and de-duplicated (`report`, `report (2)`).
- **Test**: `src/ui/state/edgecases.test.ts` — five cases (empty-sheet reuse,
  no-merge on second open, name collision, no stale tail cells, name
  derivation). The existing "import a real CSV" E2E still passes end-to-end.

### BUG-017 — opening a multi-sheet .xlsx silently dropped every tab but the first
- **Symptom**: `readXlsx` read only `SheetNames[0]`, so opening a workbook with
  Jan/Feb/Mar tabs loaded Jan and silently discarded the rest — surprising and
  data-losing for anyone opening a real multi-sheet spreadsheet.
- **Fix**: New `readXlsxWorkbook()` reads **every** non-empty worksheet with
  its name; `store.openSheets()` opens each as its own tab (first reuses an
  empty active sheet, the rest are fresh), sanitizing and de-duplicating names,
  with the first sheet active. `openRows` is now a one-sheet wrapper over it.
- **Note**: Save As → `.xlsx` still writes only the active sheet; the whole
  multi-sheet workbook round-trips through the `.aioffice` project format.
  Documented in `KNOWN_LIMITS.md`.
- **Test**: `src/io/xlsx.test.ts` (multi-sheet read, blank sheet dropped) +
  `src/ui/state/edgecases.test.ts` (tab-per-sheet, first active, duplicate
  names de-duplicated). 286 unit tests, 23 E2E green.

## Dependency security pass (v0.3.0)

### HARDENING-002 — cleared all 17 `npm audit` findings (2 critical, 12 high, 3 moderate)
- **Trigger**: `npm install` on the user's PC reported 17 vulnerabilities.
- **Triage** (what actually ships vs. dev-only):
  - **`xlsx` 0.18.5 (SHIPS IN THE APP)** — prototype pollution
    (GHSA-4r6h-8v6p-xvw6) + ReDoS (GHSA-5pgg-2g8v-p4x9), exploitable by a
    booby-trapped workbook the user opens. npm shows "no fix" because SheetJS
    stopped publishing there at 0.18.5. **Fixed** by upgrading to 0.20.3 via
    the npm alias `xlsx → @e965/xlsx@0.20.3` (a mirror of the official
    `cdn.sheetjs.com` builds — verifiable by diffing tarballs). Drop-in: all
    round-trip tests pass unchanged.
  - **`electron` 33 (SHIPS AS THE .EXE SHELL)** — ASAR integrity bypass, IPC
    reply spoofing, several use-after-frees. **Fixed**: Electron 33 → 43.1.0.
    Our shell uses only stable APIs (BrowserWindow/loadFile/
    setWindowOpenHandler) and was already hardened (contextIsolation,
    sandbox, no nodeIntegration) — no code changes needed.
  - **Dev-tooling only (never shipped)** — vitest/vite/esbuild dev-server
    advisories and electron-builder's `tar` chain. **Fixed**: vitest 2 → 4,
    @vitest/coverage-v8 4, electron-builder 25 → 26.15.3.
- **Result**: `npm audit` → **0 vulnerabilities**. Verified: tsc clean,
  286 unit tests, production build, 23 Playwright E2E all green on the new
  toolchain; electron-builder 26 + Electron 43 config/rebuild/download
  smoke-tested. Version bumped to 0.3.0.

## Excel-parity pass 2 (field report: references, fill handle, functions)

### BUG-018 — clicking a cell while typing a formula destroyed the formula
- **Symptom (field report)**: "the reference system doesnt work." Typing `=`
  and clicking another cell — the way everyone builds formulas in Excel —
  moved the selection, blurred the editor, and committed the half-typed
  formula instead of inserting the clicked cell's reference.
- **Root cause**: the grid's `onMouseDown` unconditionally called
  `setActive`, and the editor commits on blur. Excel's **point mode** (click
  = insert reference while composing) didn't exist.
- **Fix**: an `editorBridge` between grid and editor. While the editor holds
  a formula whose tail can accept a reference (after `=`, an operator, `(`,
  or `,`), clicking a cell inserts its A1 reference; dragging inserts a range
  (`A1:B3`); clicking a different cell replaces the pointed ref; typing
  resumes normal editing; and when the formula is complete, clicking commits
  as before (also Excel's behaviour).
- **Test**: E2E "point mode: click a cell while typing a formula…" builds
  `=A1+A2` entirely by pointing and asserts the result.

### FEATURE — fill handle (the little + at the selection corner)
- **Field report**: "i cannot copy the cell like i do in excel using the
  small + sign that appears at the corner of a cell."
- **Change**: a draggable fill handle on the selection's bottom-right corner
  with a dashed preview, filling in all four directions: lanes of 2+ plain
  numbers extend as an arithmetic series (1, 2 → 3, 4, 5), formulas
  re-anchor relatively (`=A1*2` filled down becomes `=A2*2`), everything else
  tiles cyclically, styles copy along, the filled area becomes the selection
  (like Excel), and the whole fill is one undo step.
- **Test**: 9 unit tests (`autofill.test.ts`) + an E2E drag test.

### FEATURE — function library 73 → 144
- **Field report**: "include all function like date() avg() sum() everything
  that you know" — `TODAY()`/`NOW()` returned `#NAME?`, `AVG` didn't exist.
- **Change**: added date & time (`TODAY`, `NOW`, `TIME`, `HOUR`, `MINUTE`,
  `SECOND`, `EDATE`, `DATEDIF`, `WEEKNUM`), math & trig (`SIN`…`ATAN2`,
  `DEGREES`/`RADIANS`, `FACT`, `GCD`/`LCM`, `QUOTIENT`, `EVEN`/`ODD`,
  `MROUND`, `RAND`/`RANDBETWEEN`, `SUMPRODUCT`, `SUMIFS`), statistics
  (`COUNTIFS`, `AVERAGEIFS`, `MAXIFS`/`MINIFS`, `LARGE`/`SMALL`, `RANK`,
  `MODE`, `PERCENTILE`/`QUARTILE`, `GEOMEAN`, `AVEDEV`, `COUNTUNIQUE`), text
  (`TEXTJOIN`, `CHAR`, `CODE`, `CLEAN`), logical & info (`IFS`, `SWITCH`,
  `ISBLANK`/`ISNUMBER`/`ISTEXT`/`ISLOGICAL`/`ISERROR`/`ISERR`/`ISNA`/
  `ISEVEN`/`ISODD`, `N`), lookup (`XLOOKUP` with if-not-found and
  approximate modes), and aliases (`AVG`, `STDEV.S`/`.P`, `VAR.S`/`.P`,
  `MODE.SNGL`, `PERCENTILE.INC`, `QUARTILE.INC`).
- **Note**: `TODAY`/`NOW`/`RAND` are non-volatile (evaluate on recalc, not
  continuously); `OFFSET`/`INDIRECT` stay unsupported because the dependency
  graph is static. Both documented in `KNOWN_LIMITS.md`.
- **Test**: 31 unit tests (`functions.extended.test.ts`) + an E2E check that
  `TODAY`/`AVG`/`IFS`/`XLOOKUP`/`TEXTJOIN` work in the real grid.
