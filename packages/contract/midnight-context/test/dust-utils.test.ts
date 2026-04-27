import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import {
  calculateDustTimeRemainingSeconds,
  formatDustTime,
} from '../src/dust-utils';

describe('formatDustTime', () => {
  it('returns undefined for 0 seconds', () => {
    expect(formatDustTime(0)).toBeUndefined();
  });

  it('returns undefined for negative seconds', () => {
    expect(formatDustTime(-1)).toBeUndefined();
    expect(formatDustTime(-100)).toBeUndefined();
  });

  it('returns <1min for 1-59 seconds', () => {
    expect(formatDustTime(1)).toBe('<1min');
    expect(formatDustTime(30)).toBe('<1min');
    expect(formatDustTime(59)).toBe('<1min');
  });

  it('returns Xmin for 60-3599 seconds', () => {
    expect(formatDustTime(60)).toBe('1min');
    expect(formatDustTime(120)).toBe('2min');
    expect(formatDustTime(2700)).toBe('45min');
    expect(formatDustTime(3599)).toBe('59min');
  });

  it('returns Xh for exact hours', () => {
    expect(formatDustTime(3600)).toBe('1h');
    expect(formatDustTime(7200)).toBe('2h');
    expect(formatDustTime(36000)).toBe('10h');
  });

  it('returns XhYmin for hours + minutes', () => {
    expect(formatDustTime(3660)).toBe('1h1min');
    expect(formatDustTime(5520)).toBe('1h32min');
    expect(formatDustTime(7260)).toBe('2h1min');
  });

  it('handles large values', () => {
    expect(formatDustTime(259200)).toBe('72h');
    expect(formatDustTime(260100)).toBe('72h15min');
  });
});

describe('calculateDustTimeRemainingSeconds', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 0 when rate is 0', () => {
    expect(
      calculateDustTimeRemainingSeconds({
        currentValue: 100n,
        maxCap: 200n,
        maxCapReachedAt: Date.now() + 60000,
        rate: 0n,
      }),
    ).toBe(0);
  });

  it('returns 0 when currentValue equals maxCap', () => {
    expect(
      calculateDustTimeRemainingSeconds({
        currentValue: 200n,
        maxCap: 200n,
        maxCapReachedAt: Date.now() + 60000,
        rate: 10n,
      }),
    ).toBe(0);
  });

  describe('refilling (currentValue < maxCap)', () => {
    it('returns 0 when maxCapReachedAt is undefined', () => {
      expect(
        calculateDustTimeRemainingSeconds({
          currentValue: 100n,
          maxCap: 200n,
          maxCapReachedAt: undefined,
          rate: 10n,
        }),
      ).toBe(0);
    });

    it('calculates time from maxCapReachedAt timestamp', () => {
      const now = Date.now();
      expect(
        calculateDustTimeRemainingSeconds({
          currentValue: 100n,
          maxCap: 200n,
          maxCapReachedAt: now + 120000,
          rate: 10n,
        }),
      ).toBe(120);
    });

    it('returns 0 when maxCapReachedAt is in the past', () => {
      const now = Date.now();
      expect(
        calculateDustTimeRemainingSeconds({
          currentValue: 100n,
          maxCap: 200n,
          maxCapReachedAt: now - 10000,
          rate: 10n,
        }),
      ).toBe(0);
    });
  });

  describe('decaying (currentValue > maxCap)', () => {
    it('calculates decay time from maxCapReachedAt timestamp', () => {
      const now = Date.now();
      expect(
        calculateDustTimeRemainingSeconds({
          currentValue: 300n,
          maxCap: 200n,
          maxCapReachedAt: now + 10000,
          rate: 10n,
        }),
      ).toBe(10);
    });

    it('returns 0 when maxCapReachedAt is undefined', () => {
      expect(
        calculateDustTimeRemainingSeconds({
          currentValue: 300n,
          maxCap: 200n,
          maxCapReachedAt: undefined,
          rate: 10n,
        }),
      ).toBe(0);
    });

    it('returns 0 when maxCapReachedAt is in the past', () => {
      const now = Date.now();
      expect(
        calculateDustTimeRemainingSeconds({
          currentValue: 300n,
          maxCap: 200n,
          maxCapReachedAt: now - 10000,
          rate: 10n,
        }),
      ).toBe(0);
    });
  });
});
