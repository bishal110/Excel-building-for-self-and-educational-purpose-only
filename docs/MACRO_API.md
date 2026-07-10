# Macros (JavaScript, Office-Scripts style)

AI_Office macros are plain **JavaScript** — not VBA. They run against a small,
documented `sheet` API. This mirrors the spirit of Office Scripts (TypeScript/JS
automation), rebuilt independently for AI_Office.

> Security note: in the app, macros run inside a Web Worker with no DOM or
> network access. The in-process test runner is **not** a sandbox — see
> KNOWN_LIMITS.md.

## The `sheet` API

Your macro receives a global `sheet` object:

| Method | Description |
|---|---|
| `sheet.get(ref)` | Read a cell's computed value (`"A1"`). |
| `sheet.getNumber(ref)` | Read a cell as a number (non-numbers → `0`). |
| `sheet.set(ref, value)` | Write a value or formula string (`"=A1+1"`). |
| `sheet.range(a1range)` | Read a range as a 2-D array of values (`"A1:C3"`). |
| `sheet.setRange(topLeft, values2D)` | Write a 2-D array starting at a cell. |
| `sheet.clear(a1range)` | Clear all cells in a range. |
| `sheet.log(...args)` | Append to the macro output log. |

## Examples

Double every value in a column:

```js
const vals = sheet.range("A1:A10");
const doubled = vals.map((row) => [row[0] * 2]);
sheet.setRange("B1", doubled);
```

Fill a computed series:

```js
for (let i = 1; i <= 12; i++) {
  sheet.set("A" + i, i * i);
}
sheet.log("Filled 12 rows");
```

Errors thrown by a macro are caught and reported in the macro output panel; they
do not crash the app.
