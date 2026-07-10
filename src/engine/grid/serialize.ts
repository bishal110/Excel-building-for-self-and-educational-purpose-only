import type { Node } from '../formula/ast';
import { formatCellRef } from '../formula/references';

/** Reconstruct a formula string (without leading '=') from an AST. */
export function serialize(node: Node): string {
  switch (node.kind) {
    case 'number':
      return String(node.value);
    case 'string':
      return '"' + node.value.replace(/"/g, '""') + '"';
    case 'boolean':
      return node.value ? 'TRUE' : 'FALSE';
    case 'error':
      return node.value;
    case 'ref':
      return formatCellRef(node.ref);
    case 'range':
      return formatCellRef(node.start) + ':' + formatCellRef(node.end);
    case 'name':
      return node.name;
    case 'call':
      return node.name + '(' + node.args.map(serialize).join(',') + ')';
    case 'unary':
      return node.op + serialize(node.operand);
    case 'postfix':
      return serialize(node.operand) + node.op;
    case 'binary':
      return serialize(node.left) + node.op + serialize(node.right);
  }
}
