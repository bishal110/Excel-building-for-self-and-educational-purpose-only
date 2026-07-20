# Gap analysis — weekly research log

One Microsoft Office feature area per week, researched against official
Microsoft documentation, compared honestly with AI_Office, and closed with a
concrete design or an honest "institutional moat" verdict (see
`docs/VS_MICROSOFT.md` for that category). Function counts follow the
facts-audit policy: lower bounds here, exact numbers only in the README.

Rotation: function library → pivot tables → conditional formatting → Word
pagination/track-changes → PowerPoint transitions/presenter view → charts →
accessibility → file-format fidelity → repeat.

---

## Week of 2026-07-13 — Excel function library

### What Microsoft ships

Excel exposes roughly **500 worksheet functions** (the VBA
`WorksheetFunction` surface lists 300+ callable members, and the by-category
reference adds the rest), organized across ~12 categories:

| Category | Examples | Notes |
|---|---|---|
| Math & trig | SUM…SERIESSUM, MROUND, BASE | broad but shallow |
| Statistical | AVERAGE…, plus ~100 distribution functions (BETA.DIST, CHISQ.*, F.*, T.*, NORM.*) | the single biggest cluster |
| Text | LEFT…TEXTJOIN, TEXTSPLIT, plus double-byte B-variants (LEFTB…) | B-variants exist for legacy DBCS |
| Logical & information | IF…IFS, IS* family, ISREF | |
| Lookup & reference | XLOOKUP, FILTER, SORT, UNIQUE, OFFSET, INDIRECT | newer ones return **arrays** |
| Date & time | DATE…, DATEVALUE, TIMEVALUE, NETWORKDAYS, WORKDAY | |
| **Financial** | PMT, IPMT, PPMT, FV, PV, NPER, RATE, NPV, IRR, MIRR, XNPV/XIRR, depreciation (SLN/SYD/DDB/DB), bond math (COUP*, ACCRINT*, DURATION) | ~55 functions |
| Engineering | CONVERT, BESSEL*, hex/bin/oct, complex numbers, ERF | ~40 |
| Database | DSUM, DCOUNT, DGET, DAVERAGE… | criteria-table driven |
| Dynamic array | FILTER, SORT, SORTBY, UNIQUE, SEQUENCE, RANDARRAY | require **spilling** |
| Web | WEBSERVICE, FILTERXML, ENCODEURL | network-dependent |
| Cube | CUBEVALUE… | OLAP-backed |

Reference: Microsoft's PMT contract (documented on Learn):
`PMT(rate, nper, pv, [fv=0], [type=0])` → periodic payment; sign convention
is cash-flow based (outflows negative).

### What AI_Office has

**140+ functions** across six of those categories (math & trig, statistical
aggregates + multi-criteria, text, logical & information, lookup, date &
time), with Excel-parity semantics policed by unit tests, plus friendly
aliases (`AVG`, dotted modern names). Coverage of the *everyday* set is
genuinely good: the SUMIFS/COUNTIFS family, XLOOKUP, IFS/SWITCH, TEXTJOIN,
TODAY/NOW/EDATE/DATEDIF are all present.

**Entirely absent categories:** financial, engineering, database, dynamic
array, web, cube.

### Verdict per missing category

| Category | Verdict | Reasoning |
|---|---|---|
| **Financial (core loan/investment nine)** | **Closable — next tranche** | Pure functions; design below |
| Financial (bond math, X* schedules) | Long tail | Real but niche; after the core nine |
| Statistical distributions | Long tail | Mechanical volume; add on demand |
| Engineering | Long tail | Low educational value per function |
| Database (DSUM…) | Closable later | Our `makeCriteria` machinery already fits |
| Dynamic arrays (FILTER/SORT/UNIQUE) | **Architecture-bound** | Needs array *spilling*: evaluator returning matrices, grid rendering spill ranges, `#SPILL!` semantics, dependency tracking on spilled areas. A real project, not a function batch — belongs with the P2+ engine roadmap |
| Web (WEBSERVICE…) | **Unsupported by design** | Violates the local-first/no-network security posture (`docs/SECURITY.md`); would stay out even if trivial |
| Cube | Institutional moat | OLAP backend required |

### Concrete design — the financial core nine

`PMT, IPMT, PPMT, FV, PV, NPER, RATE, NPV, IRR` in a new
`src/engine/formula/functions/financial.ts`, registered like every other
category. All are closed-form except two:

- Closed-form group: standard annuity algebra, e.g.
  `PMT = (pv·r·(1+r)^n + fv·r) / ((1+r·type)·(1 − (1+r)^n))` with the r→0
  limit `−(pv+fv)/n`. Excel's sign convention (result negated relative to pv)
  must be matched exactly and unit-tested against published Learn examples.
- Iterative group: `RATE` and `IRR` have no closed form — Newton–Raphson with
  a bisection fallback, capped iterations (Excel: 20 for IRR, guess default
  10%), returning `#NUM!` on non-convergence. Deterministic and unit-testable.

Sizing: ~9 functions, ~30 unit tests (including Learn's worked examples as
fixtures), no engine changes — the existing `FuncDef`/`numArg` pattern
suffices. **Sequencing per the architecture roadmap:** this tranche waits
until after the P2 formula-authoring work (autocomplete, signature help), so
new functions land discoverable rather than buried.

---

## Week of 2026-07-20 — PivotTables

### What Microsoft ships

Excel's pivot architecture (per the Learn object model and JS API docs) has
three layers and a rich field system:

1. **Source → PivotCache → report.** The cache is an intermediate snapshot of
   the source data; *Refresh* re-reads the source into the cache and the
   report recomputes from it. Several PivotTables can share one cache. The
   report remembers its `SourceData` and `RefreshDate`.
2. **Four hierarchy areas**: Filters (page), Columns, Rows, Values. Any
   number of fields per area; row/column fields nest (subtotals per level);
   a value field can appear multiple times with different aggregations.
3. **Field machinery**: per-field sorting, label/date/value/manual filter
   types, slicers (UI filter controls on the drawing layer), calculated
   fields/items, drill-down/up, grand-total toggles per axis, layout modes
   (compact/outline/tabular), style galleries, writeback for OLAP sources.

Real-world pain Microsoft's own Q&A confirms: stale pivots when the source
moved or a filter hides new data — i.e. even Excel's refresh model confuses
users when source identity is implicit. A lesson worth designing around.

### What AI_Office has

A one-shot **snapshot** builder: select a range → choose one row field, an
optional column field, one value field, one of five aggregations → a new
static sheet with grand totals. Honest and tested, but: no source binding
(edit the data and the pivot is silently stale), no refresh, no multi-value,
no nesting, no filters.

### Verdict

**Closable in stages — this is engineering, not moat** (except OLAP/writeback
and slicer-style linked visuals, which ride on infrastructure we don't have
and don't need). Staged design:

- **Stage 1 — source-bound + Refresh (next closable step).** Persist a
  `PivotDefinition` alongside the output sheet:
  `{ sourceSheet, sourceRange, rows: [i], cols: [i], values: [{field, agg}], createdAt }`.
  The pivot sheet gets a "Refresh" affordance that re-runs `pivotGrid`
  against the *live* source range and rewrites the sheet, plus a visible
  "source: Sheet1!A1:C40 · refreshed <time>" caption — making staleness
  explicit instead of silent (learning from Excel's own UX pain). Source
  sheet renamed → definition follows; deleted → the pivot sheet shows a
  clear broken-source notice, never wrong numbers. ~1 store method, dialog
  reuse, unit + E2E tests.
- **Stage 2 — multiple values + nested rows.** Generalize `pivotGrid` to
  `rows: number[]` (tree flatten with per-level subtotal rows) and
  `values: {field, agg}[]` (column group per value). Pure-engine work with
  table-driven tests.
- **Stage 3 — filters area + a drag-drop field arranger** in the dialog
  (four labeled drop zones), only after Stage 2's model is stable.
- **Out of scope by design**: OLAP cubes, writeback, slicers-as-objects —
  institutional-moat infrastructure per `docs/VS_MICROSOFT.md`.

---

*Next week's rotation slot: conditional formatting.*
