import { describe, expect, it } from 'vitest';

import {
  DEFAULT_VALIDITY_SECONDS,
  resolveValidityInterval,
} from '../../../src/store/composer/resolve-validity-interval';

import type { EraSummary } from '@cardano-sdk/core';

// =====================================================================
// A validity interval is counted in SLOTS from the chain tip. Two
// tempting shortcuts produce a transaction the node rejects: using a
// unix timestamp as a slot number, and assuming a slot lasts a second.
// These tests pin the arithmetic against both.
// =====================================================================

const era = (startSlot: number, slotLength: number): EraSummary =>
  ({
    parameters: { epochLength: 432_000, slotLength },
    start: { slot: startSlot, time: new Date(0) },
  } as EraSummary);

const oneSecondSlots = [era(0, 1000)];

describe('resolveValidityInterval', () => {
  it('anchors the window on the tip slot, not on wall-clock time', () => {
    const tipSlot = 1000;

    const { invalidHereafter } = resolveValidityInterval({
      tipSlot,
      eraSummaries: oneSecondSlots,
      validitySeconds: 600,
    });

    expect(invalidHereafter).toBe(tipSlot + 600);
    // A unix-seconds-as-slot conflation would land near 1.7e9; the slot
    // must stay within a window's reach of the tip.
    expect(Number(invalidHereafter)).toBeLessThan(
      Math.floor(Date.now() / 1000),
    );
  });

  it('scales the duration by the era slot length rather than assuming 1s slots', () => {
    const halfSecondSlots = [era(0, 500)];

    const { invalidHereafter } = resolveValidityInterval({
      tipSlot: 100,
      eraSummaries: halfSecondSlots,
      validitySeconds: 600,
    });

    // 600s at 500ms per slot is 1200 slots, not 600.
    expect(invalidHereafter).toBe(100 + 1200);
  });

  it('uses the slot length of the era in force at the tip', () => {
    const eraSummaries = [era(0, 20_000), era(500, 1000)];

    const { invalidHereafter } = resolveValidityInterval({
      tipSlot: 900,
      eraSummaries,
      validitySeconds: 60,
    });

    // The tip sits in the second era (1s slots), so 60s is 60 slots —
    // the retired 20s-slot era must not be applied.
    expect(invalidHereafter).toBe(960);
  });

  it('uses the earlier era when the tip predates the later one', () => {
    const eraSummaries = [era(0, 20_000), era(500, 1000)];

    const { invalidHereafter } = resolveValidityInterval({
      tipSlot: 100,
      eraSummaries,
      validitySeconds: 60,
    });

    // 60s at 20s per slot is 3 slots.
    expect(invalidHereafter).toBe(103);
  });

  it('rounds a partial slot up so the window is never short', () => {
    const { invalidHereafter } = resolveValidityInterval({
      tipSlot: 0,
      eraSummaries: [era(0, 20_000)],
      validitySeconds: 30,
    });

    // 30s at 20s per slot is 1.5 slots → 2.
    expect(invalidHereafter).toBe(2);
  });

  it('defaults to a two-hour window', () => {
    const { invalidHereafter } = resolveValidityInterval({
      tipSlot: 50,
      eraSummaries: oneSecondSlots,
    });

    expect(DEFAULT_VALIDITY_SECONDS).toBe(7200);
    expect(invalidHereafter).toBe(50 + 7200);
  });

  it('omits the lower bound unless a start is requested', () => {
    expect(
      resolveValidityInterval({
        tipSlot: 10,
        eraSummaries: oneSecondSlots,
      }),
    ).toEqual({ invalidHereafter: 7210 });
  });

  it('converts the lower bound with the same slot arithmetic', () => {
    expect(
      resolveValidityInterval({
        tipSlot: 10,
        eraSummaries: [era(0, 500)],
        validitySeconds: 600,
        validityStartSeconds: 60,
      }),
    ).toEqual({ invalidBefore: 10 + 120, invalidHereafter: 10 + 1200 });
  });

  it('allows a lower bound of zero seconds, pinning it to the tip', () => {
    expect(
      resolveValidityInterval({
        tipSlot: 42,
        eraSummaries: oneSecondSlots,
        validitySeconds: 600,
        validityStartSeconds: 0,
      }),
    ).toEqual({ invalidBefore: 42, invalidHereafter: 642 });
  });

  it.each([
    ['no era summaries', { tipSlot: 0, eraSummaries: [] }],
    ['an unusable slot length', { tipSlot: 0, eraSummaries: [era(0, 0)] }],
    [
      'a zero-length window',
      { tipSlot: 0, eraSummaries: oneSecondSlots, validitySeconds: 0 },
    ],
    [
      'a negative window',
      { tipSlot: 0, eraSummaries: oneSecondSlots, validitySeconds: -60 },
    ],
    [
      'a non-finite window',
      {
        tipSlot: 0,
        eraSummaries: oneSecondSlots,
        validitySeconds: Number.NaN,
      },
    ],
    [
      'a negative lower bound',
      {
        tipSlot: 0,
        eraSummaries: oneSecondSlots,
        validityStartSeconds: -1,
      },
    ],
    [
      'a lower bound at or after the upper bound',
      {
        tipSlot: 0,
        eraSummaries: oneSecondSlots,
        validitySeconds: 60,
        validityStartSeconds: 60,
      },
    ],
  ])('throws on %s', (_label, params) => {
    expect(() => resolveValidityInterval(params)).toThrow();
  });
});
