import { describe, expect, it } from 'vitest';
import { parseFormula } from './formula/parser';
import { serialize } from './grid/serialize';

const round = (f: string) => serialize(parseFormula(f));

describe('parser precedence', () => {
  it('multiplication binds tighter than addition', () => {
    expect(round('1+2*3')).toBe('1+2*3');
    // (1+2)*3 keeps addition on the left of the multiply
    const ast = parseFormula('(1+2)*3');
    expect(ast.kind).toBe('binary');
    if (ast.kind === 'binary') {
      expect(ast.op).toBe('*');
      expect(ast.left.kind).toBe('binary');
    }
  });
  it('parses unary minus tighter than ^ so -2^2 = (-2)^2', () => {
    const ast = parseFormula('-2^2');
    // binary ^ with left = unary(-2)
    expect(ast.kind).toBe('binary');
    if (ast.kind === 'binary') {
      expect(ast.op).toBe('^');
      expect(ast.left.kind).toBe('unary');
    }
  });
  it('^ is left-associative', () => {
    const ast = parseFormula('2^3^2');
    expect(ast.kind).toBe('binary');
    if (ast.kind === 'binary' && ast.left.kind === 'binary') {
      expect(ast.left.op).toBe('^');
    }
  });
  it('parses comparison at lowest precedence', () => {
    const ast = parseFormula('1+2<3*4');
    expect(ast.kind).toBe('binary');
    if (ast.kind === 'binary') expect(ast.op).toBe('<');
  });
  it('parses ranges', () => {
    const ast = parseFormula('A1:B2');
    expect(ast.kind).toBe('range');
  });
  it('parses nested function calls', () => {
    const ast = parseFormula('SUM(A1,MAX(B1,C1))');
    expect(ast.kind).toBe('call');
    if (ast.kind === 'call') {
      expect(ast.name).toBe('SUM');
      expect(ast.args).toHaveLength(2);
      expect(ast.args[1]!.kind).toBe('call');
    }
  });
  it('parses percent postfix', () => {
    const ast = parseFormula('50%');
    expect(ast.kind).toBe('postfix');
  });
  it('parses string concatenation', () => {
    const ast = parseFormula('"a"&"b"');
    expect(ast.kind).toBe('binary');
    if (ast.kind === 'binary') expect(ast.op).toBe('&');
  });
  it('handles a leading = sign', () => {
    expect(parseFormula('=1+1').kind).toBe('binary');
  });
  it('throws on trailing garbage', () => {
    expect(() => parseFormula('1 2')).toThrow();
  });
  it('throws on unbalanced parens', () => {
    expect(() => parseFormula('(1+2')).toThrow();
  });
});
