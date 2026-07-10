/** Formula lexer: turns a formula string (without leading '=') into tokens. */

export type TokenType =
  | 'number'
  | 'string'
  | 'boolean'
  | 'ref'
  | 'name'
  | 'op'
  | 'lparen'
  | 'rparen'
  | 'comma'
  | 'colon'
  | 'error';

export interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

const OPERATORS = ['<=', '>=', '<>', '+', '-', '*', '/', '^', '&', '=', '<', '>', '%'];
const ERROR_TEXT = ['#DIV/0!', '#REF!', '#VALUE!', '#NAME?', '#N/A', '#NUM!', '#CYCLE!', '#NULL!'];

export class TokenizeError extends Error {}

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = input.length;

  const isDigit = (c: string) => c >= '0' && c <= '9';
  const isLetter = (c: string) => (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z');

  while (i < n) {
    const c = input[i]!;

    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      i++;
      continue;
    }

    // Error literals like #DIV/0!
    if (c === '#') {
      const match = ERROR_TEXT.find((e) => input.startsWith(e, i));
      if (match) {
        tokens.push({ type: 'error', value: match, pos: i });
        i += match.length;
        continue;
      }
      throw new TokenizeError(`Unexpected '#' at ${i}`);
    }

    // String literal "..." with "" as escaped quote
    if (c === '"') {
      let j = i + 1;
      let s = '';
      while (j < n) {
        if (input[j] === '"') {
          if (input[j + 1] === '"') {
            s += '"';
            j += 2;
            continue;
          }
          break;
        }
        s += input[j];
        j++;
      }
      if (j >= n) throw new TokenizeError('Unterminated string literal');
      tokens.push({ type: 'string', value: s, pos: i });
      i = j + 1;
      continue;
    }

    // Number: 123, 12.5, .5, 1e3, 1.2E-3
    if (isDigit(c) || (c === '.' && isDigit(input[i + 1] ?? ''))) {
      let j = i;
      while (j < n && isDigit(input[j]!)) j++;
      if (input[j] === '.') {
        j++;
        while (j < n && isDigit(input[j]!)) j++;
      }
      if (input[j] === 'e' || input[j] === 'E') {
        let k = j + 1;
        if (input[k] === '+' || input[k] === '-') k++;
        if (isDigit(input[k] ?? '')) {
          k++;
          while (k < n && isDigit(input[k]!)) k++;
          j = k;
        }
      }
      tokens.push({ type: 'number', value: input.slice(i, j), pos: i });
      i = j;
      continue;
    }

    // Operators (multi-char first)
    const op = OPERATORS.find((o) => input.startsWith(o, i));
    if (op) {
      tokens.push({ type: 'op', value: op, pos: i });
      i += op.length;
      continue;
    }

    if (c === '(') {
      tokens.push({ type: 'lparen', value: c, pos: i });
      i++;
      continue;
    }
    if (c === ')') {
      tokens.push({ type: 'rparen', value: c, pos: i });
      i++;
      continue;
    }
    if (c === ',') {
      tokens.push({ type: 'comma', value: c, pos: i });
      i++;
      continue;
    }
    if (c === ':') {
      tokens.push({ type: 'colon', value: c, pos: i });
      i++;
      continue;
    }

    // Identifier: cell ref, range part, function name, boolean, named token.
    if (isLetter(c) || c === '$' || c === '_') {
      let j = i;
      while (j < n) {
        const ch = input[j]!;
        if (isLetter(ch) || isDigit(ch) || ch === '$' || ch === '_' || ch === '.') {
          j++;
        } else break;
      }
      const raw = input.slice(i, j);
      const upper = raw.toUpperCase();
      // Look ahead past whitespace: an identifier before '(' is a function name,
      // even when it otherwise looks like a cell ref (e.g. LOG10) or a boolean
      // literal (e.g. TRUE()).
      let k = j;
      while (k < n && (input[k] === ' ' || input[k] === '\t')) k++;
      const isCall = input[k] === '(';
      if (isCall) {
        tokens.push({ type: 'name', value: raw, pos: i });
      } else if (upper === 'TRUE' || upper === 'FALSE') {
        tokens.push({ type: 'boolean', value: upper, pos: i });
      } else if (/^\$?[A-Z]+\$?\d+$/i.test(raw)) {
        tokens.push({ type: 'ref', value: raw, pos: i });
      } else {
        tokens.push({ type: 'name', value: raw, pos: i });
      }
      i = j;
      continue;
    }

    throw new TokenizeError(`Unexpected character '${c}' at ${i}`);
  }

  return tokens;
}
