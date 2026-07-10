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

- Docs editor and `.docx` export — Phase 3.
- Slides editor and present mode — Phase 4.
- Shell, help audit, autosave/persistence hardening — Phase 5.
- Packaging (single-file HTML, PWA, Electron) — Phase 6.

## Sheets UI (Phase 2) — current limitations

- **Freeze panes are basic.** Toggling Freeze pins rows/columns above and left
  of the active cell via CSS sticky positioning; it is not a full split-pane
  implementation and does not persist a scroll offset.
- **`.xlsx` fidelity is limited.** Import/export via SheetJS carries cell values
  and formulas but **not** styles, number formats, merged cells, or charts. No
  round-trip formatting fidelity is claimed.
- **Charts are minimal.** The chart builder renders a single line/bar series
  (inline SVG) from the first numeric column of the selection. No axes labels
  config, legends, multi-series, or export-as-image yet.
- **Copy/paste is in-app only.** Clipboard operations move data within the app
  (with relative-ref adjustment); they do not integrate with the OS clipboard.
- **Formatting does not survive `.xlsx`.** Bold/italic/number-format live in the
  `.aioffice` project file and autosave, but are dropped on `.xlsx` export.
- **Bundle size.** The production JS bundle is large (~680 kB) because SheetJS is
  imported eagerly; code-splitting `.xlsx` behind a dynamic import is a Phase-6
  packaging task.
- **Autosave is single-slot.** One workbook is autosaved to `localStorage`;
  there is no multi-document manager yet (Phase 5).
