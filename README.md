# AI_Office

An offline-first core office suite — a deep **spreadsheet** plus (planned)
document and presentation editors — that runs in desktop browsers, as a
single-file offline HTML app, as an installable PWA, and (config) as a Windows
Electron app. Built independently; **not** a Microsoft 365 clone and no feature
parity is claimed (see `KNOWN_LIMITS.md`).

This repository is dedicated to AI_Office — built for self-learning and
educational purposes only.

## Status

- **Phase 0 — Plan**: done (`docs/PHASE0_PLAN.md`).
- **Phase 1 — Spreadsheet engine**: done. Framework-agnostic TypeScript formula
  + grid + macro engine with 177 passing unit tests.
- Phases 2–7 (Sheets UI, Docs, Slides, Shell, Packaging, Audit): not started.

## The engine (Phase 1)

Pure TypeScript, zero UI dependencies — importable from `src/engine`.

- **Formula engine**: tokenizer → parser → evaluator with Excel operator
  precedence (`-2^2 = 4`), `$A$1` references and ranges, and Excel error codes
  (`#DIV/0!`, `#REF!`, `#VALUE!`, `#NAME?`, `#N/A`, `#NUM!`, `#CYCLE!`) that
  propagate through references and range aggregations.
- **73 functions**: math, stats, text, logical, lookup (VLOOKUP/HLOOKUP/
  INDEX/MATCH/CHOOSE), and date basics.
- **Grid ops**: insert/delete rows & columns with reference rewriting (dead refs
  become `#REF!`), sort, fill-down/right, find & replace, cycle detection.
- **Number formats** including ₹ Indian (lakh/crore) grouping.
- **Macros** — JavaScript, Office-Scripts style (see `docs/MACRO_API.md`).

## Commands

```bash
npm install       # install dev dependencies
npm test          # run the full unit-test suite (Vitest)
npm run coverage  # run tests with coverage
npm run lint      # type-check (tsc --noEmit)
```

## Layout

```
src/engine/
  formula/   tokenizer, parser, evaluator, references, errors, functions/
  grid/      workbook, sheet, cell, mutations, ops, serialize
  format/    numberFormat (incl. ₹ Indian grouping)
  macro/     runtime (documented sheet API)
docs/        PHASE0_PLAN.md, MACRO_API.md
BUGLOG.md    every bug: symptom, root cause, fix, test
KNOWN_LIMITS.md   what is intentionally not implemented
```
