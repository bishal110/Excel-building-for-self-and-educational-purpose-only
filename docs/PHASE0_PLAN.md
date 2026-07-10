# AI_Office — Phase 0: Goal & Plan

> Status: **Phase 0 done; Phase 1 (engine) complete.** The engine lives at the
> repository root (`src/engine`), with `BUGLOG.md` and `KNOWN_LIMITS.md`.
> No application code is written in *this* Phase-0 document; the plan below
> stands as the reference architecture.
>
> Note: this project originally started as a sub-app inside another repo and was
> moved to its own dedicated repository. Any `ai-office/` path prefixes below are
> historical — files now live at the repo root (drop the prefix).
> Deliverable of Phase 0 per the build brief: architecture proposal, module map, data
> model, file-format strategy, test strategy, packaging strategy, and a risk list.

## 0. Honest scope statement

AI_Office is an **offline-first core office suite** — a deep spreadsheet plus a usable
document editor and presentation editor — that runs in desktop browsers, as a single
double-clickable HTML file, as an installable PWA, and (config + build) as a Windows
Electron app for ARM64/x64.

It is **not** a Microsoft 365 clone and will never claim feature parity. The spreadsheet
is the deepest module (the primary use case: well/ESP data — WHP, THP, FLP, choke %,
frequency Hz, motor temp, production). Docs and Slides are genuinely useful but lighter.
Anything cut for time is recorded in `KNOWN_LIMITS.md`, never silently dropped.

## 1. Repository decision (BLOCKING — needs your choice)

This repo already ships **PetroSim** (React ESP simulator) and auto-deploys to GitHub
Pages from `main` at base `/Project001/`. AI_Office must coexist without breaking that.
Three options — see the Phase 0 report / question for the recommendation:

| Option | Layout | Pros | Cons |
|---|---|---|---|
| **A. Sub-app folder (recommended)** | `ai-office/` at repo root, its own `package.json`, Vite, tests. PetroSim untouched. | Clean isolation; PetroSim deploy keeps working; independent versioning; simplest to reason about. | Two node projects in one repo; Pages workflow needs a second job or path. |
| **B. Pivot the repo** | AI_Office replaces PetroSim as the root app; PetroSim archived under `legacy/`. | Single app, single build, simplest deploy. | Destructive to the current product; PetroSim URL/Pages behaviour changes. |
| **C. Separate repo** | New repo `AI_Office`. | Total isolation. | Out of scope — session is scoped to `bishal110/Project001`. |

All module paths below assume **Option A** (`ai-office/…`). If you pick B, drop the
`ai-office/` prefix.

## 2. Architecture proposal

**Stack: Vite 6 + React 19 + TypeScript 5.8 (strict) + Tailwind v4.** Justification:

- Already validated and installed in this repo; zero onboarding cost and matches the brief's recommendation.
- Vite gives a fast dev loop, a clean production `dist/`, a trivial single-file inline build (`vite-plugin-singlefile`), and first-class PWA support (`vite-plugin-pwa`).
- React 19 + TS strict keeps the large UI (grid, ribbon, editors) maintainable and typed.
- **The formula/grid engine is authored as framework-agnostic TypeScript** (pure functions + plain classes, zero React imports). This is the single most important design rule: the engine is unit-testable in isolation with Vitest, reusable by Docs/Slides tables, and portable to Electron/worker contexts.

**Layering (strict downward dependencies):**

```
UI (React components, hooks)          ← may import engine + persistence
  │
State (per-module stores)             ← may import engine + persistence
  │
Engine (pure TS: formula, grid, macro)   ← imports NOTHING app-specific
Persistence (localStorage/IndexedDB, file I/O)  ← pure TS
```

Nothing in `engine/` imports React. Enforced by an ESLint boundary rule (Phase 1).

## 3. Module map (Option A)

```
ai-office/
├── package.json  vite.config.ts  tsconfig.json  vitest.config.ts  playwright.config.ts
├── index.html
├── public/            manifest.webmanifest, icons, offline shell
├── src/
│   ├── engine/                         # PURE TS — no React
│   │   ├── formula/
│   │   │   ├── tokenizer.ts            # lexer → tokens
│   │   │   ├── parser.ts               # tokens → AST (precedence, unary -, %)
│   │   │   ├── evaluator.ts            # AST → value, error propagation
│   │   │   ├── functions/              # math, stats, text, logical, lookup, date
│   │   │   ├── references.ts           # A1 / $A$1 parse, range expansion
│   │   │   └── errors.ts               # #DIV/0! #REF! #VALUE! #NAME? #N/A #NUM! #CYCLE
│   │   ├── grid/
│   │   │   ├── workbook.ts  sheet.ts  cell.ts
│   │   │   ├── dependencies.ts         # dep graph, cycle detection, recalc order
│   │   │   ├── mutations.ts            # insert/delete row+col with ref rewriting → #REF!
│   │   │   └── ops.ts                  # sort, fill-down, find & replace
│   │   ├── macro/runtime.ts            # sandboxed JS + documented sheet API
│   │   └── format/numberFormat.ts      # incl. ₹ Indian grouping (##,##,##0)
│   ├── io/
│   │   ├── csv.ts                      # RFC-4180 quotes/newlines
│   │   ├── xlsx.ts                     # SheetJS import/export
│   │   ├── docx.ts                     # .docx export
│   │   └── project.ts                  # .aioffice JSON (whole-suite save file)
│   ├── persistence/autosave.ts         # IndexedDB primary, localStorage fallback
│   ├── state/                          # sheets / docs / slides stores + 100-step undo
│   ├── features/
│   │   ├── sheets/   (Grid, FormulaBar, ChartBuilder, MacroEditor, toolbar)
│   │   ├── docs/     (TipTap editor, ribbon, tables)
│   │   └── slides/   (SlideList, Canvas, PresentMode)
│   ├── shell/        (Ribbon, FileMenu, Help — Help audited vs keybindings table)
│   ├── keybindings/  registry.ts       # single source of truth for shortcuts + help
│   └── main.tsx  App.tsx
├── electron/         main.ts  preload.ts  (Phase 6)
├── e2e/              Playwright specs
└── scripts/          serve-lan, build-singlefile, audit-help
```

## 4. Data model

```ts
// Workbook (Sheets)
Workbook { id; name; sheets: Sheet[]; activeSheetId }
Sheet    { id; name; cells: Map<A1, Cell>; rowCount; colCount;
           colWidths; rowHeights; frozenRows; frozenCols; charts: Chart[] }
Cell     { raw: string;            // user input ("=SUM(A1:A3)" or literal)
           value: CellValue;       // computed number|string|boolean|ErrorValue
           format?: NumberFormat; style?: CellStyle }
ErrorValue = { kind: '#DIV/0!'|'#REF!'|'#VALUE!'|'#NAME?'|'#N/A'|'#NUM!'|'#CYCLE!' }

// Document (Docs) — TipTap/ProseMirror JSON
Document { id; name; content: PMDoc; wordCount }

// Deck (Slides)
Deck  { id; name; theme; slides: Slide[] }
Slide { id; layout: 'title'|'titleBody'|'image'; blocks: Block[]; notes: string }

// Project file (.aioffice) — one JSON for the whole suite
Project { version; workbooks: Workbook[]; documents: Document[]; decks: Deck[];
          savedAt }   // savedAt stamped at write time (no Date.now in engine)
```

Cells store both `raw` and computed `value` so recalc is deterministic and undo restores
inputs, not just outputs. The dependency graph drives minimal recalculation.

## 5. File-format strategy

| Concern | Format | Library | Notes |
|---|---|---|---|
| Sheets import/export | `.csv` | none (own RFC-4180) | quotes, embedded newlines, commas |
| Sheets import/export | `.xlsx` | **SheetJS (`xlsx`)** | values + formulas where feasible |
| Docs export | `.docx` | `html-docx-js` (or `docx`) | HTML→docx; justify in Phase 3 |
| Docs/Slides print | PDF | browser print + print CSS | no PDF lib needed |
| Whole suite | `.aioffice` | native JSON | lossless round-trip, versioned |

## 6. Test strategy

- **Vitest** for all engine logic. **TDD is mandatory**: failing test first, then code. No phase advances with a red test.
- Phase-1 gate: **≥130 engine unit tests** green (tokenizer, parser, precedence incl. `-2^2 = 4`, all functions, error propagation through refs and SUM ranges, ref rewriting on insert/delete → `#REF!`, cycle detection). No existing AI_Office tests exist to port (greenfield), so all 130+ are new — noted honestly.
- **Playwright** E2E per UI phase (2: edit→formula→insert row→undo→export; 3: type→format→table→export; 4: create→reorder→present→exit).
- **Coverage** via `@vitest/coverage-v8`, reported as a real number in each phase report.
- **BUGLOG.md**: every bug (test/lint/self-found) → symptom, root cause, fix, test added.
- **No fabricated output**: every command claimed is actually run; real summaries pasted.

## 7. Packaging strategy (Phase 6 preview)

a. `dist/` Vite production build + one-command LAN serve (`scripts/serve-lan`, `python -m http.server` or `vite preview --host`).
b. Single-file `AI_Office.html` with all JS/CSS inlined via `vite-plugin-singlefile` — double-click offline.
c. **PWA**: `vite-plugin-pwa` (manifest + service worker) → desktop "Install app" + Android/iOS "Add to Home screen"; verified with Lighthouse.
d. **Electron** via `electron-builder`: `dist:win-x64` and `dist:win-arm64` portable `.exe`. This Linux container likely **cannot** cross-build a signed Windows ARM64 exe — if blocked, deliver the complete config + `BUILD_ON_WINDOWS.md` with exact commands for your ARM64 machine and say so plainly. No fabricated binaries.
e. `README.md` covering every run mode.

## 8. Excel-parity laws (locked)

- `-2^2 = 4` (unary minus binds tighter than `^` in Excel).
- Errors propagate through references and range aggregations (`#DIV/0!` in a SUM range yields `#DIV/0!`).
- Insert/delete rows/columns rewrites all formula references; references to deleted cells become `#REF!`.
- `%` is postfix (`50% = 0.5`); `&` concatenates; comparisons return booleans.
- Macros are marketed in-app as **"Macros (JavaScript, Office-Scripts style)"**, never as VBA.

## 9. Risk list

| # | Risk | Likelihood | Mitigation |
|---|---|---|---|
| R1 | Scope is very large (7 phases, 3 editors) | High | Hard phase gates + approval; spreadsheet prioritised; cuts → KNOWN_LIMITS.md |
| R2 | Electron cross-build for Windows ARM64 fails in Linux CI | High | Ship config + BUILD_ON_WINDOWS.md; state plainly, don't fabricate |
| R3 | Formula-engine edge cases (precedence, error propagation, ref rewriting) | Med | TDD, Excel-parity test corpus, cycle detection |
| R4 | Grid perf at 200×52 / 10k cells | Med | Virtualized rendering; recalc via dep graph; perf test in Phase 7 |
| R5 | Breaking PetroSim's Pages deploy | Med | Option A isolation; separate build path; verify deploy.yml unaffected |
| R6 | `Date.now`/`Math.random` unavailable in some build/agent contexts | Low | Stamp times at I/O boundary; keep engine pure/deterministic |
| R7 | Help ↔ keybindings drift | Low | Single keybinding registry; build-time audit fails on divergence |
| R8 | .xlsx/.docx fidelity limits | Med | Document supported subset in KNOWN_LIMITS.md; never claim full fidelity |

## 10. Phase gate checklist (how each phase reports)

Each phase ends with: real test counts + coverage %, commands actually run with output
summaries, new BUGLOG entries, and a done/partial/not-done checklist. Git: ≥1 commit per
phase, never with red tests, on branch `claude/new-session-nuchrw`.
