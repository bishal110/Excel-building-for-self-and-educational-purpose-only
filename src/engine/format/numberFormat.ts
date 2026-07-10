/** Number formatting, including Indian (lakh/crore) digit grouping. */

export type GroupingStyle = 'none' | 'thousand' | 'indian';

export interface NumberFormatSpec {
  decimals?: number;
  grouping?: GroupingStyle;
  prefix?: string;
  suffix?: string;
  percent?: boolean;
  negativeParens?: boolean;
}

/** Group the integer part of a number string (no sign) per the given style. */
export function groupDigits(intDigits: string, style: GroupingStyle): string {
  if (style === 'none') return intDigits;
  if (style === 'thousand') {
    return intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  // Indian: last 3 digits, then groups of 2.
  if (intDigits.length <= 3) return intDigits;
  const last3 = intDigits.slice(-3);
  const rest = intDigits.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return grouped + ',' + last3;
}

export function formatNumber(value: number, spec: NumberFormatSpec = {}): string {
  if (!Number.isFinite(value)) return String(value);
  const decimals = spec.decimals ?? 0;
  const percent = spec.percent ?? false;
  const grouping = spec.grouping ?? 'none';

  let n = percent ? value * 100 : value;
  const negative = n < 0;
  n = Math.abs(n);

  const fixed = n.toFixed(decimals);
  const [intPart, fracPart] = fixed.split('.');
  const grouped = groupDigits(intPart!, grouping);
  let body = fracPart ? `${grouped}.${fracPart}` : grouped;

  if (percent) body += '%';
  body = (spec.prefix ?? '') + body + (spec.suffix ?? '');

  if (negative) {
    return spec.negativeParens ? `(${body})` : `-${body}`;
  }
  return body;
}

/** Named presets available in the UI. */
export const PRESETS: Record<string, NumberFormatSpec> = {
  general: {},
  integer: { decimals: 0, grouping: 'thousand' },
  number2: { decimals: 2, grouping: 'thousand' },
  percent: { decimals: 2, percent: true },
  inr: { decimals: 2, grouping: 'indian', prefix: '₹' },
  inr0: { decimals: 0, grouping: 'indian', prefix: '₹' },
  usd: { decimals: 2, grouping: 'thousand', prefix: '$' },
};

export function formatWithPreset(value: number, preset: keyof typeof PRESETS): string {
  return formatNumber(value, PRESETS[preset] ?? {});
}
