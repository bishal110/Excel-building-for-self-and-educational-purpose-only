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

*Next week's rotation slot: PivotTables (source-bound model vs our snapshot
builder).*
