import * as XLSX from 'xlsx';

/** Extract one worksheet into a grid of raw strings.
 *  Formulas are preserved with a leading '='. */
function sheetToRows(ws: XLSX.WorkSheet): string[][] {
  const range = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']) : null;
  if (!range) return [];
  const rows: string[][] = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      if (!cell) {
        row.push('');
      } else if (cell.f) {
        row.push('=' + cell.f);
      } else {
        row.push(cell.v === undefined || cell.v === null ? '' : String(cell.v));
      }
    }
    rows.push(row);
  }
  return rows;
}

/** Read the first worksheet of an .xlsx file into a grid of raw strings. */
export async function readXlsx(file: File): Promise<string[][]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const first = wb.SheetNames[0];
  if (!first) return [];
  return sheetToRows(wb.Sheets[first]!);
}

/** True when the bytes start like a real workbook: ZIP (xlsx/xlsm) or CFB (xls).
 *  SheetJS otherwise "succeeds" on arbitrary bytes by treating them as text,
 *  which would silently open a corrupt file as one garbage cell. */
function looksLikeWorkbook(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  const zip = bytes[0] === 0x50 && bytes[1] === 0x4b; // "PK"
  const cfb = bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
  return zip || cfb;
}

/** Read every non-empty worksheet of an .xlsx file, preserving sheet names,
 *  so a multi-tab workbook opens with all of its tabs. */
export async function readXlsxWorkbook(
  file: File,
): Promise<{ name: string; rows: string[][] }[]> {
  const buf = await file.arrayBuffer();
  if (!looksLikeWorkbook(new Uint8Array(buf))) {
    throw new Error('Not a valid Excel workbook (corrupt or wrong file type).');
  }
  const wb = XLSX.read(buf, { type: 'array' });
  const out: { name: string; rows: string[][] }[] = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    const rows = sheetToRows(ws);
    if (rows.length === 0) continue; // skip blank sheets
    out.push({ name, rows });
  }
  return out;
}

/** Build a SheetJS worksheet from raw strings (formulas start with '='). */
function rowsToWorksheet(rows: string[][]): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  let maxC = 0;
  rows.forEach((cols, r) => {
    cols.forEach((raw, c) => {
      if (raw === '') return;
      if (c > maxC) maxC = c;
      const addr = XLSX.utils.encode_cell({ r, c });
      if (raw.startsWith('=') && raw.length > 1) {
        // A cached value (v) is required, otherwise SheetJS drops the formula.
        ws[addr] = { t: 'n', f: raw.slice(1), v: 0 };
      } else if (raw !== '' && !Number.isNaN(Number(raw))) {
        ws[addr] = { t: 'n', v: Number(raw) };
      } else {
        ws[addr] = { t: 's', v: raw };
      }
    });
  });
  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: Math.max(0, rows.length - 1), c: maxC },
  });
  return ws;
}

/** Make a name legal for .xlsx (Excel forbids : \\ / ? * [ ], empty, >31
 *  chars) and unique within the book — book_append_sheet THROWS on both,
 *  which would turn one odd user sheet name into a failed export. */
function safeSheetName(name: string, taken: Set<string>): string {
  let base = name.replace(/[:\\/?*[\]]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31);
  if (!base) base = 'Sheet';
  let candidate = base;
  let i = 2;
  while (taken.has(candidate.toLowerCase())) {
    const suffix = ` (${i++})`;
    candidate = base.slice(0, 31 - suffix.length) + suffix;
  }
  taken.add(candidate.toLowerCase());
  return candidate;
}

/** Build an .xlsx Blob from every sheet in a workbook. */
export function writeXlsxWorkbook(
  sheets: { name: string; rows: string[][] }[],
): Blob {
  const wb = XLSX.utils.book_new();
  const source = sheets.length > 0 ? sheets : [{ name: 'Sheet1', rows: [['']] }];
  const taken = new Set<string>();
  source.forEach((sheet) => {
    const rows = sheet.rows.length > 0 ? sheet.rows : [['']];
    XLSX.utils.book_append_sheet(wb, rowsToWorksheet(rows), safeSheetName(sheet.name, taken));
  });
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/** Build a one-sheet .xlsx Blob. Kept for simple exports and API compatibility. */
export function writeXlsx(rows: string[][], sheetName = 'Sheet1'): Blob {
  return writeXlsxWorkbook([{ name: sheetName, rows }]);
}
