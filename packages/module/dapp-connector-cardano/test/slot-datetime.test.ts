import { Milliseconds } from '@cardano-sdk/core';
import { describe, expect, it } from 'vitest';

import { slotToDateTime } from '../src/common/utils';

import type { Cardano, EraSummary } from '@cardano-sdk/core';

describe('slotToDateTime', () => {
  const mockEraSummaries: EraSummary[] = [
    {
      start: {
        time: new Date('2022-09-22T00:00:00.000Z'),
        slot: 0 as Cardano.Slot,
      },
      parameters: {
        epochLength: 432_000,
        slotLength: Milliseconds(1000),
      },
    },
  ];

  it('should return null for undefined slot', () => {
    const result = slotToDateTime(undefined, mockEraSummaries);
    expect(result).toBeNull();
  });

  it('should return null for undefined eraSummaries', () => {
    const result = slotToDateTime(1000 as Cardano.Slot, undefined);
    expect(result).toBeNull();
  });

  it('should return null for empty eraSummaries', () => {
    const result = slotToDateTime(1000 as Cardano.Slot, []);
    expect(result).toBeNull();
  });

  it('should convert slot to date and time correctly', () => {
    const result = slotToDateTime(86400 as Cardano.Slot, mockEraSummaries);

    expect(result).not.toBeNull();
    expect(result?.utcDate).toBe('Sep 23, 2022');
    expect(result?.utcTime).toBe('00:00:00');
  });

  it('should format date with leading zeros for day', () => {
    const result = slotToDateTime(172800 as Cardano.Slot, mockEraSummaries);

    expect(result).not.toBeNull();
    expect(result?.utcDate).toBe('Sep 24, 2022');
  });

  it('should format time with leading zeros', () => {
    const slotWithTime = 86400 + 3661;
    const result = slotToDateTime(
      slotWithTime as Cardano.Slot,
      mockEraSummaries,
    );

    expect(result).not.toBeNull();
    expect(result?.utcTime).toBe('01:01:01');
  });

  it('should handle slot at era start', () => {
    const result = slotToDateTime(0 as Cardano.Slot, mockEraSummaries);

    expect(result).not.toBeNull();
    expect(result?.utcDate).toBe('Sep 22, 2022');
    expect(result?.utcTime).toBe('00:00:00');
  });

  it('should handle large slot numbers', () => {
    const oneYearInSlots = 365 * 24 * 60 * 60;
    const result = slotToDateTime(
      oneYearInSlots as Cardano.Slot,
      mockEraSummaries,
    );

    expect(result).not.toBeNull();
    expect(result?.utcDate).toBe('Sep 22, 2023');
  });

  it('should handle December correctly', () => {
    const decemberSlot = 100 * 24 * 60 * 60;
    const result = slotToDateTime(
      decemberSlot as Cardano.Slot,
      mockEraSummaries,
    );

    expect(result).not.toBeNull();
    expect(result?.utcDate).toBe('Dec 31, 2022');
  });

  it('should include month in formatted date', () => {
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    const eraSummariesJan: EraSummary[] = [
      {
        start: {
          time: new Date('2022-01-01T00:00:00.000Z'),
          slot: 0 as Cardano.Slot,
        },
        parameters: {
          epochLength: 432_000,
          slotLength: Milliseconds(1000),
        },
      },
    ];

    const result = slotToDateTime(0 as Cardano.Slot, eraSummariesJan);

    expect(result).not.toBeNull();
    expect(result?.utcDate).toBe('Jan 01, 2022');

    const someDayResult = slotToDateTime(
      (31 * 24 * 60 * 60) as Cardano.Slot,
      eraSummariesJan,
    );
    expect(someDayResult).not.toBeNull();
    expect(someDayResult?.utcDate).toBe('Feb 01, 2022');

    for (const monthName of monthNames) {
      expect(monthName.length).toBe(3);
    }
  });

  it('should handle time at end of day', () => {
    const endOfDaySlot = 86400 - 1;
    const result = slotToDateTime(
      endOfDaySlot as Cardano.Slot,
      mockEraSummaries,
    );

    expect(result).not.toBeNull();
    expect(result?.utcTime).toBe('23:59:59');
  });
});
