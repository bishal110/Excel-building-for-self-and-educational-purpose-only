import * as XLSX from 'xlsx';

/** Read the first worksheet of an .xlsx file into a grid of raw strings.
 *  Formulas are preserved with a leading '='. */
export async function readXlsx(file: File): Promise<string[][]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const first = wb.SheetNames[0];
  if (!first) return [];
  const ws = wb.Sheets[first]!;
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

/** Build an .xlsx Blob from a grid of raw strings (formulas start with '='). */
export function writeXlsx(rows: string[][], sheetName = 'Sheet1'): Blob {
  const ws: XLSX.WorkSheet = {};
  let maxC = 0;
  rows.forEach((cols, r) => {
    cols.forEach((raw, c) => {
      if (raw === '') return;
      if (c > maxC) maxC = c;
      const addr = XLSX.utils.encode_cell({ r, c });
      if (raw.startsWith('=') && raw.length > 1) {
        ws[addr] = { t: 'n', f: raw.slice(1) };
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
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
