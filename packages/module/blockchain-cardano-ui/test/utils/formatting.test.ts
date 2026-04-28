import { describe, expect, it } from 'vitest';

import {
  formatPercentages,
  capitalizeFirstLetter,
} from '../../src/utils/formatting';

import type { Percent } from '@cardano-sdk/util';

// Mock Percent class for testing
class MockPercent {
  private readonly value: number;

  public constructor(value: number) {
    this.value = value;
  }

  public valueOf(): number {
    return this.value;
  }

  public toString(): string {
    return this.value.toString();
  }
}

describe('formatPercentages', () => {
  it('should format a simple percentage with default options', () => {
    expect(formatPercentages(0.1234)).toBe('12.34');
  });

  it('should format a percentage with Percent object', () => {
    const percent = new MockPercent(0.1234) as unknown as Percent;
    expect(formatPercentages(percent)).toBe('12.34');
  });

  it('should format zero correctly', () => {
    expect(formatPercentages(0)).toBe('0.00');
  });

  it('should format with custom decimal places', () => {
    expect(formatPercentages(0.1234, { decimalPlaces: 1 })).toBe('12.3');
    expect(formatPercentages(0.1234, { decimalPlaces: 3 })).toBe('12.340');
  });

  it('should format with halfUp rounding (default)', () => {
    expect(
      formatPercentages(0.125, { decimalPlaces: 2, rounding: 'halfUp' }),
    ).toBe('12.50');
  });

  it('should format with down rounding', () => {
    expect(
      formatPercentages(0.129, { decimalPlaces: 2, rounding: 'down' }),
    ).toBe('12.90');
  });

  it('should handle negative values', () => {
    expect(formatPercentages(-0.1234)).toBe('-12.34');
  });
});

describe('capitalizeFirstLetter', () => {
  it('should capitalize the first letter of a word', () => {
    expect(capitalizeFirstLetter('apple')).toBe('Apple');
  });
});
