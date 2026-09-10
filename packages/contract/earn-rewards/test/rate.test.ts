import { describe, expect, it } from 'vitest';

import { parseEarnRewardsRate } from '../src/rate';

describe('parseEarnRewardsRate', () => {
  it('normalizes a bare number to a single value (shorthand)', () => {
    expect(parseEarnRewardsRate(3.2)).toEqual({ kind: 'single', value: 3.2 });
  });

  it('normalizes { value } to a single value', () => {
    expect(parseEarnRewardsRate({ value: 3.2 })).toEqual({
      kind: 'single',
      value: 3.2,
    });
  });

  it('normalizes { min, max } to a range', () => {
    expect(parseEarnRewardsRate({ min: 2, max: 4 })).toEqual({
      kind: 'range',
      min: 2,
      max: 4,
    });
  });

  it('accepts an equal-bounds range (min === max)', () => {
    expect(parseEarnRewardsRate({ min: 3, max: 3 })).toEqual({
      kind: 'range',
      min: 3,
      max: 3,
    });
  });

  it('accepts the 100% domain ceiling itself', () => {
    expect(parseEarnRewardsRate(100)).toEqual({ kind: 'single', value: 100 });
  });

  it('prefers an explicit single value over range fields when both are present', () => {
    expect(parseEarnRewardsRate({ value: 3.2, min: 2, max: 4 })).toEqual({
      kind: 'single',
      value: 3.2,
    });
  });

  it.each<[string, unknown]>([
    ['undefined', undefined],
    ['null', null],
    ['a numeric string', '3.2'],
    ['a percent string', '3.2%'],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['an empty object', {}],
    ['a non-numeric value', { value: '3.2' }],
    ['a partial range (min only)', { min: 2 }],
    ['a partial range (max only)', { max: 4 }],
    ['a range with a non-numeric bound', { min: 2, max: '4' }],
    // Domain validation: violations hide the rate-led copy entirely rather
    // than rendering a nonsense financial claim.
    ['a zero rate', 0],
    ['a negative rate', -3],
    ['a negative single value', { value: -3 }],
    ['a zero range bound', { min: 0, max: 4 }],
    ['an inverted range (min > max)', { min: 5, max: 2 }],
    ['a rate above the 100% ceiling (bps-style entry)', 250],
    ['a range bound above the 100% ceiling', { min: 2, max: 250 }],
  ])('returns undefined for %s', (_label, raw) => {
    expect(parseEarnRewardsRate(raw)).toBeUndefined();
  });
});
