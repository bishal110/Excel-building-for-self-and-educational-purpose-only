# UI/UX foundations

This document explains the visual and interaction system used by AI Office.
It exists so future interface work stays coherent instead of becoming a pile
of one-off CSS rules.

The goal is a credible desktop productivity environment with an original
identity. The project borrows established interaction principles—ribbons,
document canvases, inspectors, status bars—but does not copy Microsoft names,
logos, artwork, or exact trade dress.

## Product principles

1. **The document is the focus.** Chrome should make commands easy to find
   without competing with the sheet, page, or slide.
2. **Density with hierarchy.** Desktop productivity software needs many
   controls, but grouping, spacing, and labels should make that density calm.
3. **Actions must be real.** Do not add decorative or disabled future-feature
   buttons to make a toolbar look fuller.
4. **State must be visible.** Active modules, ribbon tabs, formatting toggles,
   selections, disabled actions, save scope, and experimental features need
   explicit visual states.
5. **Local-first must be honest.** “Saved locally” means browser/device
   persistence. It must never imply cloud synchronization.
6. **Accessibility is part of the component contract.** Keyboard focus,
   accessible names, selected state, dialog semantics, and reduced ambiguity
   are required rather than optional polish.

## Application shell

`src/ui/App.tsx` owns the shared shell. The root receives one module class:

- `module-sheets` — green accent
- `module-docs` — blue accent
- `module-slides` — warm orange accent

These classes change CSS custom properties rather than duplicating component
styles. Module navigation is a labelled segmented control with SVG icons and
pressed state. The title bar also identifies the personal workspace and the
scope of local persistence.

The File menu in `src/ui/shell/FileMenu.tsx` keeps stable test IDs while using
structured menu items, descriptions, format labels, and proper expanded/menu
semantics.

## Design tokens

Global tokens live at the top of `src/ui/styles.css`:

| Token family | Purpose |
|---|---|
| `--bg`, `--canvas`, `--panel*` | Document and surrounding workspace layers |
| `--border*`, `--grid-line` | Structural separation at different strengths |
| `--text`, `--muted`, `--subtle` | Three-level text hierarchy |
| `--accent*`, `--selected` | Module identity, selection, and focus |
| `--danger*` | Destructive and high-risk actions |
| `--shadow-*` | Menus, pages, inspectors, and modal elevation |

Use tokens in new components. Avoid raw colours unless they represent a
content-specific warning, chart series, or slide theme.

Typography uses Segoe UI Variable when available and falls back to system UI
fonts. Formula/code fields use Cascadia Code or Consolas. No web-font download
is required, preserving the offline build.

## Icons and command controls

`src/ui/components/Icon.tsx` contains the local, dependency-free SVG set.
Every icon:

- uses a shared 24×24 coordinate system;
- inherits `currentColor` for module, hover, disabled, and contrast states;
- is decorative (`aria-hidden`) while the owning button supplies the name;
- avoids platform-dependent emoji and font glyphs.

Use `.icon-btn` for compact commands and `.tool-btn` when the command needs an
icon plus a visible label. Important and unfamiliar commands should keep their
labels. Destructive actions use `.quiet-danger` rather than appearing red at
all times.

## Sheets workspace

The Sheets UI preserves the engine’s existing dimensions and hit-testing
constants. Visual changes must not independently change `--row-h`,
`--header-h`, or `--row-head-w`; corresponding TypeScript constants in
`Grid.tsx` must change in the same commit.

The workspace now provides:

- stable-height ribbon panels without tab-switch layout jumps;
- visible formatting and alignment toggle states;
- a labelled formula input and active-cell name box;
- semantic grid, row, column-header, row-header, and grid-cell roles;
- selected row and column header feedback;
- a functional top-left Select All control;
- low-contrast grid lines with a strong active-cell outline;
- flat sheet tabs and a compact Ready/selection/local status bar.

The underlying `Sheet.setRaw` grows logical dimensions when an import or
programmatic edit writes beyond the initial viewport. Excel export writes all
current worksheets rather than silently saving only the active tab.

## Docs workspace

Docs uses the shared command surface and icon system. Formatting controls show
their active state, insert/export commands remain grouped, and export actions
stay at the far edge of the toolbar. The page sits on a neutral pasteboard with
an offline ruler, paper border, and focus-within treatment.

TipTap commands must retain `chain().focus()` so toolbar actions preserve the
editor selection. Print styles hide the shell, ruler, and status bar.

## Slides workspace

Slides uses a three-pane desktop layout:

1. thumbnail navigator;
2. central 16:9 canvas stage;
3. sticky properties inspector.

At narrower widths the inspector moves below the canvas; on small screens the
thumbnail navigator becomes a horizontal strip. Existing drag/reorder, print,
and presentation behavior is preserved. Thumbnails expose selected state and a
keyboard activation path.

## Dialogs and risky tools

`src/ui/components/DialogFrame.tsx` is the shared frame for Help, Charts,
PivotTables, and Macros. It supplies:

- `role="dialog"`, `aria-modal`, and a labelled heading;
- Escape-to-close;
- contained Tab navigation;
- initial focus and focus return;
- backdrop dismissal without accidental clicks inside the dialog.

Macros are explicitly labelled experimental because they execute local
JavaScript on the UI thread. The warning must remain until execution moves to
an isolated worker with a timeout and message-based mutations.

## Responsive and verification contract

Interface changes must remain usable at 360, 768, and 1366 pixels without
document-level horizontal overflow. Dense command surfaces may scroll within
their own region; the whole application must not become wider than its window.

Run this gate before merging UI changes:

```bash
npm run lint
npm test
npm run build
npm run e2e
```

Visual review should cover Sheets, Docs, and Slides at a desktop size plus the
768 and 360 pixel breakpoints. Also verify keyboard focus, disabled commands,
open File menus, and every modal.

## Deliberate next steps

The design foundation is not a claim of Microsoft Office feature parity. The
next high-value UX work is:

- replace remaining browser prompts/alerts with typed dialogs and toasts;
- introduce real project names plus saving/saved/error session state;
- add keyboard-accessible sheet rename/delete and column resize alternatives;
- scroll the active spreadsheet cell into view during keyboard navigation;
- isolate macros in a worker before describing them as safe for untrusted code;
- add screenshot regression coverage for the three main workspaces.

Keep `KNOWN_LIMITS.md` accurate as these items change.
