import type { Node } from './ast';
import { CellError, DIV0, NAME, NUM, VALUE, isError } from './errors';
import { expandRange, type CellRef } from './references';
import { getFunction } from './functions';
import { CellValue, toNumber, toText } from './values';

/** How the evaluator reads cells and named values from the outside world. */
export interface EvalContext {
  getValue(col: number, row: number): CellValue;
  getName?(name: string): CellValue | undefined;
}

/** Toolkit handed to each built-in function. */
export interface EvalApi {
  ctx: EvalContext;
  evalScalar(node: Node): CellValue;
  /** Flatten a node to a list of values: a range yields every cell, a scalar
   *  yields a single value. */
  flatten(node: Node): CellValue[];
  /** Cell coordinates covered by a range/ref node, or null for non-references. */
  rangeCells(node: Node): Array<{ col: number; row: number }> | null;
}

export function evaluate(node: Node, ctx: EvalContext): CellValue {
  const api = makeApi(ctx);
  return api.evalScalar(node);
}

function makeApi(ctx: EvalContext): EvalApi {
  const evalScalar = (node: Node): CellValue => evalNode(node, api);
  const api: EvalApi = {
    ctx,
    evalScalar,
    flatten(node) {
      const cells = api.rangeCells(node);
      if (cells) return cells.map((c) => ctx.getValue(c.col, c.row));
      return [evalScalar(node)];
    },
    rangeCells(node) {
      if (node.kind === 'ref') return [{ col: node.ref.col, row: node.ref.row }];
      if (node.kind === 'range') return expandRange({ start: node.start, end: node.end });
      return null;
    },
  };
  return api;
}

function evalNode(node: Node, api: EvalApi): CellValue {
  switch (node.kind) {
    case 'number':
      return node.value;
    case 'string':
      return node.value;
    case 'boolean':
      return node.value;
    case 'error':
      return new CellError(node.value as CellError['kind']);
    case 'ref':
      return api.ctx.getValue(node.ref.col, node.ref.row);
    case 'range':
      // A bare range in scalar position is not supported (no implicit intersection).
      return VALUE;
    case 'name': {
      const v = api.ctx.getName?.(node.name);
      return v === undefined ? NAME : v;
    }
    case 'call': {
      const fn = getFunction(node.name);
      if (!fn) return NAME;
      return fn(node.args, api);
    }
    case 'unary': {
      const v = toNumber(api.evalScalar(node.operand));
      if (isError(v)) return v;
      return node.op === '-' ? -v : v;
    }
    case 'postfix': {
      const v = toNumber(api.evalScalar(node.operand));
      if (isError(v)) return v;
      return v / 100;
    }
    case 'binary':
      return evalBinary(node, api);
  }
}

function evalBinary(
  node: Extract<Node, { kind: 'binary' }>,
  api: EvalApi,
): CellValue {
  const op = node.op;
  const l = api.evalScalar(node.left);
  const r = api.evalScalar(node.right);

  if (op === '&') {
    const a = toText(l);
    if (isError(a)) return a;
    const b = toText(r);
    if (isError(b)) return b;
    return a + b;
  }

  if (['=', '<>', '<', '>', '<=', '>='].includes(op)) {
    return compareOp(op, l, r);
  }

  const a = toNumber(l);
  if (isError(a)) return a;
  const b = toNumber(r);
  if (isError(b)) return b;

  switch (op) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '*':
      return a * b;
    case '/':
      return b === 0 ? DIV0 : a / b;
    case '^': {
      const res = Math.pow(a, b);
      return Number.isNaN(res) || !Number.isFinite(res) ? NUM : res;
    }
    default:
      return VALUE;
  }
}

/** Excel type ranking for cross-type comparison: number < text < boolean. */
function typeRank(v: CellValue): number {
  if (typeof v === 'number') return 1;
  if (typeof v === 'string') return 2;
  if (typeof v === 'boolean') return 3;
  return 0; // null
}

function compareOp(op: string, lRaw: CellValue, rRaw: CellValue): CellValue {
  if (isError(lRaw)) return lRaw;
  if (isError(rRaw)) return rRaw;

  // Coerce a blank cell to match the other operand's type.
  let l = lRaw;
  let r = rRaw;
  if (l === null && r !== null) l = blankAs(r);
  if (r === null && l !== null) r = blankAs(l);
  if (l === null && r === null) {
    l = 0;
    r = 0;
  }

  let cmp: number;
  if (typeof l === 'number' && typeof r === 'number') {
    cmp = l < r ? -1 : l > r ? 1 : 0;
  } else if (typeof l === 'string' && typeof r === 'string') {
    const a = l.toUpperCase();
    const b = r.toUpperCase();
    cmp = a < b ? -1 : a > b ? 1 : 0;
  } else if (typeof l === 'boolean' && typeof r === 'boolean') {
    cmp = (l ? 1 : 0) - (r ? 1 : 0);
  } else {
    cmp = typeRank(l) - typeRank(r);
    cmp = cmp < 0 ? -1 : cmp > 0 ? 1 : 0;
  }

  switch (op) {
    case '=':
      return cmp === 0;
    case '<>':
      return cmp !== 0;
    case '<':
      return cmp < 0;
    case '>':
      return cmp > 0;
    case '<=':
      return cmp <= 0;
    case '>=':
      return cmp >= 0;
    default:
      return VALUE;
  }
}

function blankAs(other: CellValue): number | string | boolean | null {
  if (typeof other === 'number') return 0;
  if (typeof other === 'string') return '';
  if (typeof other === 'boolean') return false;
  return null;
}

export type { CellRef };
