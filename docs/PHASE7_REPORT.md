# Phase 7 — Final audit report

> **Historical snapshot.** This report records the state at Phase 7
> completion. Counts (tests, functions) have grown since — the README and
> `BUGLOG.md` track the present.

All seven phases of the AI_Office build plan are complete. This report records
the final adversarial audit: what was tested, what broke, what was fixed, and
exactly what the project ships.

## 1. Clean-checkout verification (run, not claimed)

A fresh `git clone` into an empty directory, then `npm install` and the full
suite — **before** any Phase 7 changes:

| Check | Result |
|---|---|
| Unit tests (Vitest) | 253 passed / 0 failed |
| E2E tests (Playwright) | 17 passed / 0 failed |
| `npm run build` (tsc → Help audit → vite) | success |
| `npm run build:single` | success (`AI_Office.html`, 1.41 MB) |

## 2. Adversarial findings (all fixed, all regression-tested)

| Bug | Severity | Summary |
|---|---|---|
| **BUG-011** | High | Formula chains ~1,000 deep (running totals) crashed to `#VALUE!` via call-stack overflow. Evaluator rewritten to iterative topological evaluation. |
| **BUG-012** | Medium (a11y) | Focused toolbar buttons couldn't be activated with Enter/Space — the grid hijacked the keys. |
| **BUG-013** | Medium | Type-to-edit dropped the first typed character (`=A1*8` became text `A1*8`). |

Details, root causes, and guarding tests: see `BUGLOG.md`.

## 3. Checks that passed without findings

- Undo/redo across sheet switches; per-sheet formula isolation.
- Paste at/beyond grid edges; macro on an empty sheet; circular references
  surviving row deletion; CSV with quotes and embedded newlines.
- **Performance**: 10,000-cell fill + full-range `SUM` complete well under the
  test ceilings (fill < 5 s, SUM < 3 s; observed far lower). A 1,000-cell
  dependency chain evaluates without recursion.
- **Keyboard-only walkthrough**: navigate → type → formula → F2 → Escape →
  undo, with a visible active-cell indicator and `:focus-visible` on the grid.
- **Responsive**: 0 px horizontal overflow at 360 / 768 / 1366 px (screenshots
  captured at all three widths).

## 4. Final totals

| Metric | Value |
|---|---|
| Unit tests | **259** (27 files) |
| E2E tests | **20** (6 files, incl. 3 click-through audits + a11y + responsive) |
| Engine functions | **73** |
| Type-check | clean (`tsc --noEmit`, strict + `noUncheckedIndexedAccess`) |
| Build gate | `tsc` → Help↔keybinding audit → vite, all green |
| Bugs found & fixed across the project | **13 logged** (BUGLOG.md), 0 open |

## 5. Shipped artifacts (exact, with sizes)

| Artifact | Size | How to produce |
|---|---|---|
| `dist/` web build (JS 1.37 MB, CSS 11 KB, PWA manifest/SW/icons) | ~1.6 MB total | `npm run build` |
| `dist-single/AI_Office.html` (standalone, offline, double-click) | 1.41 MB | `npm run build:single` |
| PWA (installable, offline after first visit) | part of `dist/` | serve `dist/` over http(s) |
| Windows portable `.exe` config (x64 + ARM64) | — | `npm run dist:win-*` **on Windows** (see `BUILD_ON_WINDOWS.md`; not buildable in the dev container — network policy blocks Electron binaries) |

## 6. Feature checklist (done / partial / not done)

**Done** — formula engine (73 functions, Excel-parity `-2^2=4`, error
propagation, `#CYCLE!`, ref rewriting on insert/delete), virtualized grid,
freeze panes, undo/redo (100), clipboard with relative refs, number formats
incl. ₹ Indian grouping, sort, find & replace, multi-sheet, CSV + xlsx
import/export, chart builder (line/bar), JS macros with documented API, Docs
editor (TipTap) with `.docx` export + print-to-PDF, Slides editor with
drag-reorder / themes / present mode / PDF export, File menu with whole-suite
`.aioffice`, autosave, Help generated from the keybinding registry with a
build-failing audit, PWA, single-file build, LAN serve.

**Partial** — `.xlsx` fidelity (values + formulas, no styles); `.docx` export
subset (no images/links in the file); charts (single series); freeze panes
(basic, not split panes); macros sandbox (worker isolation deferred).

**Not done** (recorded in `KNOWN_LIMITS.md`) — cross-sheet references,
criteria wildcards, `.pptx` export, presenter view, `.docx` import,
code-splitting, Electron binary build in-container, Lighthouse run.

## 7. Honest scope statement

AI_Office is an educational, self-learning project. It is **not** a Microsoft
365 clone, claims no feature parity, uses an original UI with no Microsoft
assets, and its macros are JavaScript ("Office-Scripts style"), never VBA.
