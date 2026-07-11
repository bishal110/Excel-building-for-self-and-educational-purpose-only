# AI_Office — Sheets

> An offline-first spreadsheet built from scratch in TypeScript + React.
> Created for **self-learning and educational purposes** — to understand how a
> real spreadsheet (formula engine, grid, macros) works under the hood.

AI_Office is **not** a Microsoft 365 clone and claims no feature parity. It is a
genuinely useful spreadsheet with a deep, well-tested formula engine. Every
intentional limitation is written down in [`KNOWN_LIMITS.md`](./KNOWN_LIMITS.md)
— nothing is hidden.

---

## ✨ Features

| Area | What works today |
|------|------------------|
| **Formula engine** | Excel-style precedence (`-2^2 = 4`), `$A$1` absolute refs, ranges, error codes (`#DIV/0!`, `#REF!`, `#VALUE!`, `#NAME?`, `#N/A`, `#NUM!`, `#CYCLE!`) that propagate through references and ranges, and cycle detection. |
| **73 functions** | Math, statistics, text, logical, lookup (`VLOOKUP`/`HLOOKUP`/`INDEX`/`MATCH`/`CHOOSE`) and date basics. |
| **Grid** | Virtualized rendering (smooth at 200×52 and beyond), mouse + keyboard selection, inline editing, column resize, freeze header row/column. |
| **Editing** | Full shortcut set — copy/cut/paste, undo/redo (100 steps), bold/italic/underline, select-all, AutoSum (`Alt+=`), `F2`, `Tab`/`Enter`/`Esc`/`Delete`. |
| **Formats** | Number formats including **₹ Indian (lakh/crore)** grouping, percent, currency, thousands. |
| **Sheets** | Multiple sheets with tabs (add / rename / delete). |
| **Data** | Sort, find & replace, insert/delete rows & columns with reference rewriting. |
| **Import / export** | CSV (RFC-4180) and `.xlsx` (via SheetJS); save/open a whole workbook as a `.aioffice` JSON file. |
| **Charts** | Basic line / bar chart builder from a selected range. |
| **Macros** | JavaScript, Office-Scripts style, with a documented `sheet` API — **never** VBA. See [`docs/MACRO_API.md`](./docs/MACRO_API.md). |
| **Documents** | Rich-text editor (TipTap) with a ribbon — styles/headings, font, bold/italic/underline, lists, alignment, insert table/image/link — a page-styled canvas, live word count, and **export to `.docx`** plus print-to-PDF. |
| **Presentations** | Slide deck editor — title/body/image layouts, four themes, **drag-to-reorder** slide list, speaker notes, **full-screen present mode** with keyboard nav, and export the deck to PDF. |
| **App shell** | A **File menu** (New / Open / Save whole-suite `.aioffice` project) plus contextual module tabs. In-app Help lists only shortcuts that actually work — a **build-time audit fails the build** if Help and the key handler diverge. Responsive down to 360px. |
| **Persistence** | Autosaves the workbook, the document, and the slide deck to the browser (localStorage); one `.aioffice` file saves/opens all three modules together. |

---

## 🚀 Quick start

**Prerequisites:** [Node.js](https://nodejs.org/) 20 or newer.

```bash
# 1. Install dependencies
npm install

# 2. Start the app in development mode
npm run dev
```

Then open the URL printed in the terminal (default **http://localhost:3000**).

### Build a production version

```bash
npm run build     # type-checks, then bundles into dist/
npm run preview   # serve the built app locally to check it
```

The contents of `dist/` are static files — you can host them on any web server,
including a simple LAN server:

```bash
npx vite preview --host        # serve on your network
# or, from the dist/ folder:
python -m http.server 8080     # then open http://<this-pc-ip>:8080
```

---

## 🧪 Testing

```bash
npm test          # run all unit tests (Vitest)
npm run coverage  # unit tests with a coverage report
npm run lint      # type-check with the TypeScript compiler
npm run e2e       # end-to-end browser tests (Playwright)
```

- **253 unit tests** cover the formula engine, grid operations, CSV/XLSX, the
  document model, the slide deck, the whole-suite project format, and the app
  store (including a feature-by-feature audit, the Help↔keybinding audit, and
  safety edge cases).
- **Playwright E2E (17 tests)** cover the Sheets flow (edit → formula → insert row →
  undo → export, freeze, macros, help), the Docs flow (type → format → insert
  table → export `.docx`), the Slides flow (create → reorder → present → exit),
  the File menu (save/new), a **responsive audit** at 360/768/1366px, and three
  click-through **audits** that fail on any uncaught runtime error.
- `npm run build` runs the **Help↔keybinding audit** and fails if the in-app Help
  ever advertises a shortcut the handler doesn't implement (or vice-versa).

> First-time E2E users may need browsers: `npm run e2e:install`.

---

## 📁 Project structure

```
src/
├── engine/                 # Framework-agnostic spreadsheet engine (no React)
│   ├── formula/            #   tokenizer → parser → evaluator, 73 functions
│   ├── grid/               #   workbook, sheet, mutations, sort/fill/find
│   ├── format/             #   number formatting (incl. ₹ Indian grouping)
│   └── macro/              #   sandboxed JS macro runtime + sheet API
├── io/                     # CSV, XLSX, .docx, and .aioffice serialization
└── ui/                     # React application
    ├── state/              #   spreadsheet store (undo/redo, selection, autosave)
    ├── components/         #   Grid, Toolbar, FormulaBar, tabs, modals
    ├── sheets/             #   Sheets workspace (keyboard, wiring)
    ├── docs/               #   Docs editor (TipTap) + ribbon
    ├── slides/             #   Slides deck editor + present mode
    ├── shell/              #   File menu (whole-suite New/Open/Save)
    └── keybindings.ts      #   shortcut registry (Help + build audit)
e2e/                        # Playwright end-to-end tests
docs/                       # Architecture plan and macro API reference
```

The **engine is deliberately independent of React** — it is pure TypeScript,
fully unit-tested, and could be reused outside this app.

**Why TipTap for the document editor?** The editor is built on
[TipTap](https://tiptap.dev/) (a maintained wrapper over ProseMirror) rather than
the deprecated `document.execCommand`. TipTap gives a structured, well-tested
document model (clean JSON we convert to `.docx`), predictable cross-browser
behaviour, and first-class extensions for tables, links, and images — none of
which `execCommand` reliably provides.

---

## 📜 Available scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Start the Vite dev server with hot reload. |
| `npm run build` | Type-check and produce a production build in `dist/`. |
| `npm run preview` | Serve the production build locally. |
| `npm test` | Run the unit-test suite once. |
| `npm run test:watch` | Run unit tests in watch mode. |
| `npm run coverage` | Unit tests with coverage. |
| `npm run lint` | Type-check only (no emit). |
| `npm run e2e` | Run Playwright end-to-end tests. |

---

## 🗺️ Roadmap

This project is being built in phases:

- ✅ **Phase 0** — Architecture & plan ([`docs/PHASE0_PLAN.md`](./docs/PHASE0_PLAN.md))
- ✅ **Phase 1** — Spreadsheet engine (formula / grid / macro)
- ✅ **Phase 2** — Sheets UI
- ✅ **Phase 3** — Document editor
- ✅ **Phase 4** — Presentation editor
- ✅ **Phase 5** — App shell, in-app help, persistence (this release)
- ⬜ **Phase 6** — Packaging (single-file HTML, PWA, desktop)
- ⬜ **Phase 7** — Adversarial audit & polish

See [`KNOWN_LIMITS.md`](./KNOWN_LIMITS.md) for what is intentionally out of scope,
and [`BUGLOG.md`](./BUGLOG.md) for the running record of bugs found and fixed.

---

## 🤝 Contributing

This is a personal learning project. If you'd like to explore or extend it, see
[`CONTRIBUTING.md`](./CONTRIBUTING.md).

## 📄 License

[MIT](./LICENSE) — free to use, learn from, and build upon.
