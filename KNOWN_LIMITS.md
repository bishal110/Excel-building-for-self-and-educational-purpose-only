# KNOWN_LIMITS — AI_Office

Honest record of what is deliberately **not** implemented or intentionally
simplified. AI_Office is a useful core suite, **not** a Microsoft 365 clone —
no feature parity is claimed. Items are moved here rather than silently dropped.

## Engine (Phase 1) — current limitations

- **Cross-sheet references** (`Sheet2!A1`) are not yet supported in formulas.
  The engine models a single sheet's cells; the workbook holds multiple sheets
  but formulas cannot yet reference another sheet. Planned for a later phase.
- **Bare ranges in scalar context** (e.g. `=A1:A3 + 1`) return `#VALUE!`.
  Implicit intersection and dynamic-array spilling are not implemented.
- **Wildcards in criteria** (`*`, `?`) for `COUNTIF`/`SUMIF`/`AVERAGEIF` are not
  supported; criteria support comparison operators (`>`, `<=`, `<>`, …) and exact
  (case-insensitive) matches only.
- **Date serial system**: dates are whole days since 1899-12-30. This matches
  Excel for all dates on or after 1900-03-01. The historical Excel "1900 is a
  leap year" bug is intentionally **not** reproduced, so serials for
  1900-01-01…1900-02-28 differ from Excel by one.
- **Non-deterministic functions** `TODAY`, `NOW`, `RAND`, `RANDBETWEEN` are not
  in the engine core (they would make recalculation non-deterministic and
  untestable). They will be provided by the app shell with a controlled clock.
- **`TEXT` format strings** support only simple numeric patterns (`0`, `0.00`,
  …). Full Excel format-code parsing (date codes, sections, colors) is not done.
- **Number precision** uses IEEE-754 doubles like Excel, but AI_Office does not
  replicate Excel's 15-significant-digit display rounding.

## Macro runtime (Phase 1)

- The in-process `runMacro` is **not a security sandbox** — it shadows common
  globals (`window`, `document`, `fetch`, `process`) but cannot fully isolate
  untrusted code. True isolation (Web Worker, no DOM/network) is delivered by the
  app shell in Phase 2. Do not run untrusted macros in the in-process runtime.

## Not started yet (planned by phase)

- Sheets UI, charts, CSV/XLSX import-export — Phase 2.
- Docs editor and `.docx` export — Phase 3.
- Slides editor and present mode — Phase 4.
- Shell, help audit, autosave/persistence — Phase 5.
- Packaging (single-file HTML, PWA, Electron) — Phase 6.
