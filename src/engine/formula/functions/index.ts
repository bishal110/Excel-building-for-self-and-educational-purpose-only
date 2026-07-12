import type { FuncDef } from './helpers';
import { mathFunctions } from './math';
import { statsFunctions } from './stats';
import { textFunctions } from './text';
import { logicalFunctions } from './logical';
import { lookupFunctions } from './lookup';
import { dateFunctions } from './date';

const registry: Record<string, FuncDef> = {
  ...mathFunctions,
  ...statsFunctions,
  ...textFunctions,
  ...logicalFunctions,
  ...lookupFunctions,
  ...dateFunctions,
};

// Friendly aliases for names people type from habit.
registry['AVG'] = registry['AVERAGE']!;
registry['MODE.SNGL'] = registry['MODE']!;
registry['PERCENTILE.INC'] = registry['PERCENTILE']!;
registry['QUARTILE.INC'] = registry['QUARTILE']!;
registry['STDEV.S'] = registry['STDEV']!;
registry['STDEV.P'] = registry['STDEVP']!;
registry['VAR.S'] = registry['VAR']!;
registry['VAR.P'] = registry['VARP']!;

export function getFunction(name: string): FuncDef | undefined {
  return registry[name.toUpperCase()];
}

export function functionNames(): string[] {
  return Object.keys(registry).sort();
}

export function functionCount(): number {
  return Object.keys(registry).length;
}

export type { FuncDef };
