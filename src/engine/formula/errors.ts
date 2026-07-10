/** Excel-compatible error values. Errors are first-class cell values that
 *  propagate through references and range aggregations. */

export const ERROR_KINDS = [
  '#DIV/0!',
  '#REF!',
  '#VALUE!',
  '#NAME?',
  '#N/A',
  '#NUM!',
  '#CYCLE!',
] as const;

export type ErrorKind = (typeof ERROR_KINDS)[number];

export class CellError {
  readonly kind: ErrorKind;
  constructor(kind: ErrorKind) {
    this.kind = kind;
  }
  toString(): string {
    return this.kind;
  }
}

export const DIV0 = new CellError('#DIV/0!');
export const REF = new CellError('#REF!');
export const VALUE = new CellError('#VALUE!');
export const NAME = new CellError('#NAME?');
export const NA = new CellError('#N/A');
export const NUM = new CellError('#NUM!');
export const CYCLE = new CellError('#CYCLE!');

export function isError(v: unknown): v is CellError {
  return v instanceof CellError;
}

export function errorFromText(text: string): CellError | null {
  const found = ERROR_KINDS.find((k) => k === text);
  return found ? new CellError(found) : null;
}
