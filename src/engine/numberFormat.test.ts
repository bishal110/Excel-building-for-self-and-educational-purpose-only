import { describe, expect, it } from 'vitest';
import { formatNumber, formatWithPreset, groupDigits } from './format/numberFormat';

describe('groupDigits', () => {
  it('thousand grouping', () => {
    expect(groupDigits('1234567', 'thousand')).toBe('1,234,567');
    expect(groupDigits('100', 'thousand')).toBe('100');
  });
  it('INDIAN grouping (lakh/crore)', () => {
    expect(groupDigits('1234567', 'indian')).toBe('12,34,567');
    expect(groupDigits('10000000', 'indian')).toBe('1,00,00,000');
    expect(groupDigits('999', 'indian')).toBe('999');
    expect(groupDigits('1000', 'indian')).toBe('1,000');
  });
});

describe('formatNumber', () => {
  it('formats with decimals and grouping', () => {
    expect(formatNumber(1234.5, { decimals: 2, grouping: 'thousand' })).toBe('1,234.50');
  });
  it('formats negatives', () => {
    expect(formatNumber(-1234, { grouping: 'thousand' })).toBe('-1,234');
    expect(formatNumber(-5, { negativeParens: true })).toBe('(5)');
  });
  it('formats percentages', () => {
    expect(formatNumber(0.1234, { percent: true, decimals: 1 })).toBe('12.3%');
  });
  it('applies prefix and suffix', () => {
    expect(formatNumber(50, { prefix: '$' })).toBe('$50');
    expect(formatNumber(50, { suffix: ' Hz' })).toBe('50 Hz');
  });
  it('INR preset with Indian grouping', () => {
    expect(formatWithPreset(1234567.5, 'inr')).toBe('₹12,34,567.50');
    expect(formatWithPreset(1234567, 'inr0')).toBe('₹12,34,567');
  });
  it('USD preset', () => {
    expect(formatWithPreset(1234.5, 'usd')).toBe('$1,234.50');
  });
});
