import type { CellRef } from './references';

export type Node =
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'error'; value: string }
  | { kind: 'ref'; ref: CellRef }
  | { kind: 'range'; start: CellRef; end: CellRef }
  | { kind: 'name'; name: string }
  | { kind: 'call'; name: string; args: Node[] }
  | { kind: 'unary'; op: '-' | '+'; operand: Node }
  | { kind: 'postfix'; op: '%'; operand: Node }
  | { kind: 'binary'; op: string; left: Node; right: Node };
