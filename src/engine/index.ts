/** Public entry point for the AI_Office spreadsheet engine. */

export { Sheet } from './grid/sheet';
export { Workbook } from './grid/workbook';
export {
  insertRows,
  deleteRows,
  insertCols,
  deleteCols,
} from './grid/mutations';
export { fillDown, fillRight, sortRange, findReplace, offsetFormula } from './grid/ops';
export { parseFormula } from './formula/parser';
export { tokenize } from './formula/tokenizer';
export { evaluate, type EvalContext } from './formula/evaluator';
export { CellError, isError } from './formula/errors';
export type { CellValue } from './formula/values';
export {
  functionNames,
  functionCount,
  getFunction,
} from './formula/functions';
export {
  parseCellRef,
  formatCellRef,
  colToNumber,
  numberToCol,
} from './formula/references';
export { formatNumber, formatWithPreset, groupDigits, PRESETS } from './format/numberFormat';
export { runMacro, createSheetApi } from './macro/runtime';
