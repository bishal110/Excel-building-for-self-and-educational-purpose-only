import type { Node } from './ast';
import { parseCellRef } from './references';
import { tokenize, type Token } from './tokenizer';

export class ParseError extends Error {}

/**
 * Recursive-descent parser with Excel operator precedence.
 * Precedence low→high: comparison, &, +/-, * /, ^, unary -, postfix %.
 * Unary minus binds tighter than ^ (so -2^2 = 4). ^ is left-associative.
 */
class Parser {
  private tokens: Token[];
  private i = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token | undefined {
    return this.tokens[this.i];
  }
  private next(): Token | undefined {
    return this.tokens[this.i++];
  }
  private expect(type: Token['type']): Token {
    const t = this.next();
    if (!t || t.type !== type) {
      throw new ParseError(`Expected ${type} but got ${t ? t.type : 'end'}`);
    }
    return t;
  }

  parse(): Node {
    const node = this.parseComparison();
    if (this.peek()) {
      throw new ParseError(`Unexpected token '${this.peek()!.value}'`);
    }
    return node;
  }

  private parseComparison(): Node {
    let left = this.parseConcat();
    while (this.isOp('=', '<>', '<', '>', '<=', '>=')) {
      const op = this.next()!.value;
      const right = this.parseConcat();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  private parseConcat(): Node {
    let left = this.parseAdditive();
    while (this.isOp('&')) {
      this.next();
      const right = this.parseAdditive();
      left = { kind: 'binary', op: '&', left, right };
    }
    return left;
  }

  private parseAdditive(): Node {
    let left = this.parseMultiplicative();
    while (this.isOp('+', '-')) {
      const op = this.next()!.value;
      const right = this.parseMultiplicative();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  private parseMultiplicative(): Node {
    let left = this.parseExponent();
    while (this.isOp('*', '/')) {
      const op = this.next()!.value;
      const right = this.parseExponent();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  private parseExponent(): Node {
    let left = this.parseUnary();
    while (this.isOp('^')) {
      this.next();
      const right = this.parseUnary();
      left = { kind: 'binary', op: '^', left, right };
    }
    return left;
  }

  private parseUnary(): Node {
    if (this.isOp('-', '+')) {
      const op = this.next()!.value as '-' | '+';
      const operand = this.parseUnary();
      return { kind: 'unary', op, operand };
    }
    return this.parsePostfix();
  }

  private parsePostfix(): Node {
    let node = this.parsePrimary();
    while (this.isOp('%')) {
      this.next();
      node = { kind: 'postfix', op: '%', operand: node };
    }
    return node;
  }

  private parsePrimary(): Node {
    const t = this.peek();
    if (!t) throw new ParseError('Unexpected end of formula');

    switch (t.type) {
      case 'number':
        this.next();
        return { kind: 'number', value: Number(t.value) };
      case 'string':
        this.next();
        return { kind: 'string', value: t.value };
      case 'boolean':
        this.next();
        return { kind: 'boolean', value: t.value === 'TRUE' };
      case 'error':
        this.next();
        return { kind: 'error', value: t.value };
      case 'lparen': {
        this.next();
        const node = this.parseComparison();
        this.expect('rparen');
        return node;
      }
      case 'ref': {
        this.next();
        const start = parseCellRef(t.value);
        if (!start) throw new ParseError(`Bad cell reference '${t.value}'`);
        if (this.peek()?.type === 'colon') {
          this.next();
          const endTok = this.expect('ref');
          const end = parseCellRef(endTok.value);
          if (!end) throw new ParseError(`Bad cell reference '${endTok.value}'`);
          return { kind: 'range', start, end };
        }
        return { kind: 'ref', ref: start };
      }
      case 'name': {
        this.next();
        if (this.peek()?.type === 'lparen') {
          this.next();
          const args: Node[] = [];
          if (this.peek()?.type !== 'rparen') {
            args.push(this.parseComparison());
            while (this.peek()?.type === 'comma') {
              this.next();
              args.push(this.parseComparison());
            }
          }
          this.expect('rparen');
          return { kind: 'call', name: t.value.toUpperCase(), args };
        }
        return { kind: 'name', name: t.value };
      }
      default:
        throw new ParseError(`Unexpected token '${t.value}'`);
    }
  }

  private isOp(...ops: string[]): boolean {
    const t = this.peek();
    return !!t && t.type === 'op' && ops.includes(t.value);
  }
}

export function parseFormula(input: string): Node {
  const src = input.startsWith('=') ? input.slice(1) : input;
  return new Parser(tokenize(src)).parse();
}
