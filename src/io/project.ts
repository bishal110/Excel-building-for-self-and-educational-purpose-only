import { Workbook } from '../engine';
import { Sheet } from '../engine/grid/sheet';

/** Visual + format metadata that lives outside the calc engine. */
export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: 'left' | 'center' | 'right';
  /** Number-format preset key (see engine/format/numberFormat PRESETS). */
  format?: string;
}

export interface SheetMeta {
  styles: Map<string, CellStyle>; // key: "col,row"
  colWidths: Map<number, number>;
  frozenRows: number;
  frozenCols: number;
}

export function emptyMeta(): SheetMeta {
  return { styles: new Map(), colWidths: new Map(), frozenRows: 0, frozenCols: 0 };
}

/** Serializable project snapshot (the `.aioffice` payload and autosave value). */
export interface ProjectState {
  version: 1;
  app: 'AI_Office';
  activeIndex: number;
  sheets: SheetStateJSON[];
}

interface SheetStateJSON {
  name: string;
  rowCount: number;
  colCount: number;
  cells: Record<string, string>; // "col,row" -> raw
  styles: Record<string, CellStyle>;
  colWidths: Record<string, number>;
  frozenRows: number;
  frozenCols: number;
}

export function serializeProject(
  wb: Workbook,
  metas: SheetMeta[],
): ProjectState {
  const sheets: SheetStateJSON[] = [];
  for (let i = 0; i < wb.sheetCount; i++) {
    const sheet = wb.sheetAt(i)!;
    const meta = metas[i] ?? emptyMeta();
    const cells: Record<string, string> = {};
    for (const [col, row, raw] of sheet.entries()) cells[`${col},${row}`] = raw;
    sheets.push({
      name: sheet.name,
      rowCount: sheet.rowCount,
      colCount: sheet.colCount,
      cells,
      styles: Object.fromEntries(meta.styles),
      colWidths: Object.fromEntries(
        [...meta.colWidths].map(([k, v]) => [String(k), v]),
      ),
      frozenRows: meta.frozenRows,
      frozenCols: meta.frozenCols,
    });
  }
  return { version: 1, app: 'AI_Office', activeIndex: wb.activeIndex, sheets };
}

export function deserializeProject(
  state: ProjectState,
): { wb: Workbook; metas: SheetMeta[] } {
  const wb = new Workbook();
  // Remove the default sheet; we rebuild from the state.
  while (wb.sheetCount > 1) wb.removeSheet(wb.sheetCount - 1);
  const metas: SheetMeta[] = [];

  state.sheets.forEach((sheetState, index) => {
    let sheet: Sheet;
    if (index === 0) {
      sheet = wb.sheetAt(0)!;
      wb.renameSheet(0, sheetState.name);
    } else {
      sheet = wb.addSheet(sheetState.name);
    }
    sheet.rowCount = sheetState.rowCount;
    sheet.colCount = sheetState.colCount;
    for (const [key, raw] of Object.entries(sheetState.cells)) {
      const [c, r] = key.split(',').map(Number) as [number, number];
      sheet.setRaw(c, r, raw);
    }
    const meta = emptyMeta();
    meta.frozenRows = sheetState.frozenRows;
    meta.frozenCols = sheetState.frozenCols;
    for (const [k, v] of Object.entries(sheetState.styles)) meta.styles.set(k, v);
    for (const [k, v] of Object.entries(sheetState.colWidths)) {
      meta.colWidths.set(Number(k), v);
    }
    metas.push(meta);
  });

  wb.activeIndex = Math.min(state.activeIndex, wb.sheetCount - 1);
  return { wb, metas };
}
