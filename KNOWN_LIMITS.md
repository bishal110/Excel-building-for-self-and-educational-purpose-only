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

## Docs UI (Phase 3) — current limitations

- **`.docx` export is a subset.** Paragraphs, headings, bold/italic/underline,
  alignment, bullet/numbered lists, and tables are exported. **Images, hyperlinks
  as clickable links, font-family, and custom colors are not yet written to the
  `.docx`** (they remain in the on-screen editor). No round-trip `.docx` import.
- **Print-to-PDF uses the browser.** "Print / PDF" calls the browser's print
  dialog with print CSS; there is no direct PDF file writer.
- **Images are by URL only.** Inserting an image prompts for a URL; there is no
  file upload/embed, and images are not embedded into the `.docx`.
- **No pagination.** The page canvas is a single continuous A4-width sheet; it
  does not paginate into discrete printed pages on screen.
- **Bundle size grew.** Adding TipTap + `docx` pushes the production bundle to
  ~1.4 MB (gzip ~445 kB). Code-splitting the Docs module and `.xlsx`/`.docx`
  writers behind dynamic imports is a Phase-6 packaging task.

## Slides UI (Phase 4) — current limitations

- **Three layouts only** (Title, Title + Body, Image). No multi-column layouts,
  shapes, or free-form positioning of elements.
- **Text-only body.** The slide body is plain multi-line text (no inline rich
  formatting, bullet styling, or per-run fonts/colors).
- **Images are by URL.** Same as Docs — no file upload/embed.
- **Deck export is PDF only** (via the browser print dialog with print CSS). No
  `.pptx` export.
- **Transitions/animations are not implemented** — present mode is a static
  slide-to-slide advance.
- **Speaker notes** are stored and editable but are not shown in a separate
  presenter view during present mode.
