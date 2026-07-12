import {
  Workbook,
  formatWithPreset,
  isError,
  offsetFormula,
} from '../../engine';
import { PRESETS } from '../../engine/format/numberFormat';
import { insertRows, deleteRows, insertCols, deleteCols } from '../../engine/grid/mutations';
import { findReplace, sortRange } from '../../engine/grid/ops';
import { pivotGrid, type PivotConfig } from '../../engine/grid/pivot';
import { runMacro } from '../../engine/macro/runtime';
import { numberToCol } from '../../engine/formula/references';
import { CellValue } from '../../engine/formula/values';
import {
  CellStyle,
  ProjectState,
  SheetMeta,
  deserializeProject,
  emptyMeta,
  serializeProject,
} from '../../io/project';

export interface CellPos {
  col: number;
  row: number;
}
export interface RangeBox {
  c1: number;
  r1: number;
  c2: number;
  r2: number;
}
export interface Selection {
  active: CellPos;
  anchor: CellPos;
}

interface Clipboard {
  width: number;
  height: number;
  cut: boolean;
  origin: CellPos;
  raws: string[][];
  styles: (CellStyle | undefined)[][];
}

const AUTOSAVE_KEY = 'ai-office:autosave';
const UNDO_LIMIT = 100;

export function selectionBox(sel: Selection): RangeBox {
  return {
    c1: Math.min(sel.active.col, sel.anchor.col),
    r1: Math.min(sel.active.row, sel.anchor.row),
    c2: Math.max(sel.active.col, sel.anchor.col),
    r2: Math.max(sel.active.row, sel.anchor.row),
  };
}

/** Derive a valid, trimmed sheet name from a file name (Excel's rules: no
 *  `: \ / ? * [ ]`, non-empty, at most 31 chars). */
export function sheetNameFromFile(fileName: string): string {
  const stem = fileName.replace(/\.[^.]+$/, '');
  const cleaned = stem.replace(/[:\\/?*[\]]/g, ' ').replace(/\s+/g, ' ').trim();
  return (cleaned || 'Sheet').slice(0, 31);
}

export class Store {
  private wb = new Workbook();
  private metas: SheetMeta[] = [emptyMeta()];
  selection: Selection = { active: { col: 0, row: 0 }, anchor: { col: 0, row: 0 } };
  editing: CellPos | null = null;
  editInitial: string | null = null;

  private undoStack: ProjectState[] = [];
  private redoStack: ProjectState[] = [];
  private clipboard: Clipboard | null = null;

  private version = 0;
  private listeners = new Set<() => void>();

  constructor() {
    this.tryLoadAutosave();
  }

  // ---- React binding --------------------------------------------------
  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getVersion = (): number => this.version;
  private emit() {
    this.version++;
    for (const l of this.listeners) l();
    this.scheduleAutosave();
  }

  // ---- Accessors ------------------------------------------------------
  get workbook(): Workbook {
    return this.wb;
  }
  activeSheet() {
    return this.wb.active();
  }
  activeMeta(): SheetMeta {
    return this.metas[this.wb.activeIndex] ?? emptyMeta();
  }
  sheetNames(): string[] {
    return this.wb.sheetNames();
  }
  activeIndex(): number {
    return this.wb.activeIndex;
  }
  getRaw(col: number, row: number): string {
    return this.activeSheet().getRaw(col, row);
  }
  getValue(col: number, row: number): CellValue {
    return this.activeSheet().getValue(col, row);
  }
  getStyle(col: number, row: number): CellStyle | undefined {
    return this.activeMeta().styles.get(`${col},${row}`);
  }
  colWidth(col: number): number {
    return this.activeMeta().colWidths.get(col) ?? 96;
  }

  /** Display text for a cell, applying its number format when it holds a number. */
  displayText(col: number, row: number): string {
    const v = this.getValue(col, row);
    if (v === null) return '';
    if (isError(v)) return v.kind;
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (typeof v === 'number') {
      const fmt = this.getStyle(col, row)?.format;
      if (fmt && fmt !== 'general' && fmt in PRESETS) {
        return formatWithPreset(v, fmt as keyof typeof PRESETS);
      }
      return String(v);
    }
    return v;
  }

  usedBounds(): RangeBox {
    let c2 = 0;
    let r2 = 0;
    for (const [c, r] of this.activeSheet().entries()) {
      if (c > c2) c2 = c;
      if (r > r2) r2 = r;
    }
    return { c1: 0, r1: 0, c2, r2 };
  }

  // ---- Undo / transactions -------------------------------------------
  private snapshot(): ProjectState {
    return serializeProject(this.wb, this.metas);
  }
  private restore(state: ProjectState) {
    const { wb, metas } = deserializeProject(state);
    this.wb = wb;
    this.metas = metas;
  }
  private mutate(fn: () => void) {
    this.undoStack.push(this.snapshot());
    if (this.undoStack.length > UNDO_LIMIT) this.undoStack.shift();
    this.redoStack = [];
    fn();
    this.emit();
  }
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
  undo() {
    const prev = this.undoStack.pop();
    if (!prev) return;
    this.redoStack.push(this.snapshot());
    this.restore(prev);
    this.clampSelection();
    this.emit();
  }
  redo() {
    const next = this.redoStack.pop();
    if (!next) return;
    this.undoStack.push(this.snapshot());
    this.restore(next);
    this.clampSelection();
    this.emit();
  }

  // ---- Selection ------------------------------------------------------
  setActive(col: number, row: number, extend = false) {
    const c = Math.max(0, col);
    const r = Math.max(0, row);
    this.selection = {
      active: { col: c, row: r },
      anchor: extend ? this.selection.anchor : { col: c, row: r },
    };
    this.emit();
  }
  moveActive(dCol: number, dRow: number, extend = false) {
    this.setActive(
      this.selection.active.col + dCol,
      this.selection.active.row + dRow,
      extend,
    );
  }
  selectAll() {
    const b = this.usedBounds();
    this.selection = {
      anchor: { col: 0, row: 0 },
      active: { col: Math.max(b.c2, 0), row: Math.max(b.r2, 0) },
    };
    this.emit();
  }
  private clampSelection() {
    const a = this.selection.active;
    this.selection = { active: { ...a }, anchor: { ...a } };
  }

  // ---- Editing --------------------------------------------------------
  startEditing(pos: CellPos, initial: string | null = null) {
    this.editing = pos;
    this.editInitial = initial;
    this.emit();
  }
  stopEditing() {
    this.editing = null;
    this.editInitial = null;
    this.emit();
  }
  commitCell(col: number, row: number, raw: string) {
    this.mutate(() => {
      this.activeSheet().setRaw(col, row, raw);
      this.editing = null;
      this.editInitial = null;
    });
  }

  clearSelection() {
    const b = selectionBox(this.selection);
    this.mutate(() => {
      const s = this.activeSheet();
      const meta = this.activeMeta();
      for (let r = b.r1; r <= b.r2; r++) {
        for (let c = b.c1; c <= b.c2; c++) {
          s.setRaw(c, r, '');
          meta.styles.delete(`${c},${r}`);
        }
      }
    });
  }

  // ---- Formatting -----------------------------------------------------
  applyStyle(partial: CellStyle) {
    const b = selectionBox(this.selection);
    this.mutate(() => {
      const meta = this.activeMeta();
      for (let r = b.r1; r <= b.r2; r++) {
        for (let c = b.c1; c <= b.c2; c++) {
          const key = `${c},${r}`;
          meta.styles.set(key, { ...meta.styles.get(key), ...partial });
        }
      }
    });
  }
  toggleStyle(prop: 'bold' | 'italic' | 'underline') {
    const b = selectionBox(this.selection);
    const cur = this.activeMeta().styles.get(`${b.c1},${b.r1}`);
    this.applyStyle({ [prop]: !cur?.[prop] });
  }
  setNumberFormat(format: string) {
    this.applyStyle({ format });
  }
  setColWidth(col: number, width: number) {
    this.activeMeta().colWidths.set(col, Math.max(32, Math.round(width)));
    this.emit();
  }
  toggleFreeze() {
    const meta = this.activeMeta();
    const active = this.selection.active;
    if (meta.frozenRows > 0 || meta.frozenCols > 0) {
      meta.frozenRows = 0;
      meta.frozenCols = 0;
    } else {
      meta.frozenRows = Math.max(active.row, 1);
      meta.frozenCols = active.col > 0 ? active.col : 0;
    }
    this.emit();
  }

  // ---- Row / column mutations ----------------------------------------
  private shiftStyleKeys(
    meta: SheetMeta,
    axis: 'row' | 'col',
    at: number,
    delta: number,
  ) {
    const next = new Map<string, CellStyle>();
    for (const [key, style] of meta.styles) {
      const [c, r] = key.split(',').map(Number) as [number, number];
      let nc = c;
      let nr = r;
      const idx = axis === 'row' ? r : c;
      if (delta > 0) {
        if (idx >= at) axis === 'row' ? (nr = r + delta) : (nc = c + delta);
      } else {
        const count = -delta;
        if (idx >= at && idx < at + count) continue; // deleted
        if (idx >= at + count) axis === 'row' ? (nr = r + delta) : (nc = c + delta);
      }
      next.set(`${nc},${nr}`, style);
    }
    meta.styles = next;
  }
  insertRowAt(row: number) {
    this.mutate(() => {
      insertRows(this.activeSheet(), row, 1);
      this.shiftStyleKeys(this.activeMeta(), 'row', row, 1);
    });
  }
  deleteRowAt(row: number) {
    this.mutate(() => {
      deleteRows(this.activeSheet(), row, 1);
      this.shiftStyleKeys(this.activeMeta(), 'row', row, -1);
    });
  }
  insertColAt(col: number) {
    this.mutate(() => {
      insertCols(this.activeSheet(), col, 1);
      this.shiftStyleKeys(this.activeMeta(), 'col', col, 1);
    });
  }
  deleteColAt(col: number) {
    this.mutate(() => {
      deleteCols(this.activeSheet(), col, 1);
      this.shiftStyleKeys(this.activeMeta(), 'col', col, -1);
    });
  }

  // ---- Sheets ---------------------------------------------------------
  addSheet() {
    this.mutate(() => {
      this.wb.addSheet();
      this.metas.push(emptyMeta());
      this.wb.activeIndex = this.wb.sheetCount - 1;
      this.clampSelection();
    });
  }
  removeSheet(index: number) {
    if (this.wb.sheetCount <= 1) return;
    this.mutate(() => {
      this.wb.removeSheet(index);
      this.metas.splice(index, 1);
      this.clampSelection();
    });
  }
  renameSheet(index: number, name: string) {
    this.mutate(() => this.wb.renameSheet(index, name));
  }
  setActiveSheet(index: number) {
    this.wb.activeIndex = index;
    this.clampSelection();
    this.emit();
  }

  // ---- Clipboard ------------------------------------------------------
  copy(cut = false) {
    const b = selectionBox(this.selection);
    const raws: string[][] = [];
    const styles: (CellStyle | undefined)[][] = [];
    const s = this.activeSheet();
    const meta = this.activeMeta();
    for (let r = b.r1; r <= b.r2; r++) {
      const rowRaws: string[] = [];
      const rowStyles: (CellStyle | undefined)[] = [];
      for (let c = b.c1; c <= b.c2; c++) {
        rowRaws.push(s.getRaw(c, r));
        rowStyles.push(meta.styles.get(`${c},${r}`));
      }
      raws.push(rowRaws);
      styles.push(rowStyles);
    }
    this.clipboard = {
      width: b.c2 - b.c1 + 1,
      height: b.r2 - b.r1 + 1,
      cut,
      origin: { col: b.c1, row: b.r1 },
      raws,
      styles,
    };
    this.emit();
  }
  paste() {
    const clip = this.clipboard;
    if (!clip) return;
    const target = this.selection.active;
    this.mutate(() => {
      const s = this.activeSheet();
      const meta = this.activeMeta();
      for (let r = 0; r < clip.height; r++) {
        for (let c = 0; c < clip.width; c++) {
          const destC = target.col + c;
          const destR = target.row + r;
          const raw = clip.raws[r]![c]!;
          const dCol = destC - (clip.origin.col + c);
          const dRow = destR - (clip.origin.row + r);
          s.setRaw(destC, destR, clip.cut ? raw : offsetFormula(raw, dCol, dRow));
          const style = clip.styles[r]![c];
          const key = `${destC},${destR}`;
          if (style) meta.styles.set(key, { ...style });
          else meta.styles.delete(key);
        }
      }
      if (clip.cut) {
        for (let r = 0; r < clip.height; r++) {
          for (let c = 0; c < clip.width; c++) {
            s.setRaw(clip.origin.col + c, clip.origin.row + r, '');
            meta.styles.delete(`${clip.origin.col + c},${clip.origin.row + r}`);
          }
        }
        this.clipboard = null;
      }
    });
  }

  // ---- Formulas helpers ----------------------------------------------
  autoSum() {
    const { col, row } = this.selection.active;
    const s = this.activeSheet();
    // Prefer contiguous numbers directly above; fall back to the left.
    let top = row - 1;
    while (top >= 0 && typeof s.getValue(col, top) === 'number') top--;
    if (top < row - 1) {
      const first = top + 1;
      const ref = `${numberToCol(col)}${first + 1}:${numberToCol(col)}${row}`;
      this.commitCell(col, row, `=SUM(${ref})`);
      return;
    }
    let left = col - 1;
    while (left >= 0 && typeof s.getValue(left, row) === 'number') left--;
    if (left < col - 1) {
      const first = left + 1;
      const ref = `${numberToCol(first)}${row + 1}:${numberToCol(col - 1)}${row + 1}`;
      this.commitCell(col, row, `=SUM(${ref})`);
      return;
    }
    this.startEditing({ col, row });
  }

  // ---- Selection statistics (status bar) ------------------------------
  selectionStats(): { count: number; sum: number; avg: number | null } {
    const b = selectionBox(this.selection);
    const nums: number[] = [];
    for (let r = b.r1; r <= b.r2; r++) {
      for (let c = b.c1; c <= b.c2; c++) {
        const v = this.getValue(c, r);
        if (typeof v === 'number') nums.push(v);
      }
    }
    const sum = nums.reduce((a, x) => a + x, 0);
    return {
      count: nums.length,
      sum,
      avg: nums.length ? sum / nums.length : null,
    };
  }

  // ---- Sort / find-replace / macro ------------------------------------
  sortSelection(ascending: boolean) {
    const b = selectionBox(this.selection);
    this.mutate(() => {
      sortRange(this.activeSheet(), { ...b, keyCol: b.c1, ascending });
    });
  }
  findReplaceAll(find: string, replace: string, matchCase = false): number {
    let changed = 0;
    this.mutate(() => {
      changed = findReplace(this.activeSheet(), find, replace, { matchCase });
    });
    return changed;
  }
  /** Header labels of the current selection's first row (for pivot fields). */
  selectionHeaders(): string[] {
    const b = selectionBox(this.selection);
    const out: string[] = [];
    for (let c = b.c1; c <= b.c2; c++) {
      const v = this.getValue(c, b.r1);
      out.push(v === null || v === '' ? numberToCol(c) : String(v));
    }
    return out;
  }

  /** Build a pivot table from the selection into a new sheet; returns its name. */
  createPivotSheet(cfg: PivotConfig): string {
    const b = selectionBox(this.selection);
    const data: import('../../engine/formula/values').CellValue[][] = [];
    for (let r = b.r1; r <= b.r2; r++) {
      const row: import('../../engine/formula/values').CellValue[] = [];
      for (let c = b.c1; c <= b.c2; c++) row.push(this.getValue(c, r));
      data.push(row);
    }
    const grid = pivotGrid(data, cfg);

    let name = '';
    this.mutate(() => {
      let i = 1;
      while (this.wb.sheetByName(`Pivot${i}`)) i++;
      name = `Pivot${i}`;
      const sheet = this.wb.addSheet(name);
      const meta = emptyMeta();
      grid.forEach((row, r) => {
        row.forEach((v, c) => {
          if (v !== '') sheet.setRaw(c, r, v);
          if (r === 0 || c === 0) meta.styles.set(`${c},${r}`, { bold: true });
        });
      });
      this.metas.push(meta);
      this.wb.activeIndex = this.wb.sheetCount - 1;
      this.clampSelection();
    });
    return name;
  }

  runMacroCode(code: string): { logs: string[]; error?: string } {
    let result: { logs: string[]; error?: string } = { logs: [] };
    this.mutate(() => {
      result = runMacro(this.activeSheet(), code);
    });
    return result;
  }

  // ---- Import / export ------------------------------------------------
  importRows(rows: string[][], startCol = 0, startRow = 0) {
    this.mutate(() => {
      const s = this.activeSheet();
      rows.forEach((cols, r) => {
        cols.forEach((raw, c) => s.setRaw(startCol + c, startRow + r, raw));
      });
    });
  }

  /**
   * Open imported rows as a file: load them into the active sheet when it is
   * empty (renamed after the file), otherwise into a fresh sheet named after
   * the file. Never merges over existing cells and never discards them, so a
   * user can open a second file without losing the first. Returns the sheet
   * name shown.
   */
  openRows(rows: string[][], fileName: string): string {
    let name = '';
    this.mutate(() => {
      const base = sheetNameFromFile(fileName);
      const active = this.activeSheet();
      const isEmpty = active.entries().length === 0;
      let target = active;
      if (isEmpty) {
        name = this.uniqueSheetName(base, this.wb.activeIndex);
        this.wb.renameSheet(this.wb.activeIndex, name);
      } else {
        name = this.uniqueSheetName(base, -1);
        target = this.wb.addSheet(name);
        this.metas.push(emptyMeta());
        this.wb.activeIndex = this.wb.sheetCount - 1;
      }
      rows.forEach((cols, r) => cols.forEach((raw, c) => target.setRaw(c, r, raw)));
      this.clampSelection();
    });
    return name;
  }

  /** A sheet name unique among all sheets except the one at `exceptIndex`. */
  private uniqueSheetName(base: string, exceptIndex: number): string {
    const taken = new Set(this.wb.sheetNames().filter((_, i) => i !== exceptIndex));
    if (!taken.has(base)) return base;
    let i = 2;
    while (taken.has(`${base} (${i})`)) i++;
    return `${base} (${i})`;
  }
  exportRows(): string[][] {
    const b = this.usedBounds();
    const rows: string[][] = [];
    const s = this.activeSheet();
    for (let r = 0; r <= b.r2; r++) {
      const row: string[] = [];
      for (let c = 0; c <= b.c2; c++) {
        const v = s.getValue(c, r);
        row.push(v === null ? '' : isError(v) ? v.kind : String(v));
      }
      rows.push(row);
    }
    return rows;
  }
  /** Raw contents (formulas kept as "=…") for lossless .xlsx export. */
  exportRowsRaw(): string[][] {
    const b = this.usedBounds();
    const rows: string[][] = [];
    const s = this.activeSheet();
    for (let r = 0; r <= b.r2; r++) {
      const row: string[] = [];
      for (let c = 0; c <= b.c2; c++) row.push(s.getRaw(c, r));
      rows.push(row);
    }
    return rows;
  }

  // ---- Project persistence -------------------------------------------
  toProject(): ProjectState {
    return this.snapshot();
  }
  loadProject(state: ProjectState) {
    this.undoStack.push(this.snapshot());
    this.redoStack = [];
    this.restore(state);
    this.clampSelection();
    this.emit();
  }
  newProject() {
    this.undoStack.push(this.snapshot());
    this.redoStack = [];
    this.wb = new Workbook();
    this.metas = [emptyMeta()];
    this.clampSelection();
    this.emit();
  }

  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;
  private scheduleAutosave() {
    if (typeof localStorage === 'undefined') return;
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(() => {
      try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(this.snapshot()));
      } catch {
        /* storage full or unavailable — ignore */
      }
    }, 400);
  }
  private tryLoadAutosave() {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) return;
      const state = JSON.parse(raw) as ProjectState;
      if (state?.app === 'AI_Office') this.restore(state);
    } catch {
      /* corrupt autosave — start fresh */
    }
  }
}

export const store = new Store();
