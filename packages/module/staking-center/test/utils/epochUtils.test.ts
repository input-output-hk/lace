import { Cardano } from '@cardano-sdk/core';
import { describe, expect, it } from 'vitest';

import {
  calculateEpochEnd,
  calculateEpochFromSlot,
} from '../../src/utils/epochUtils';

import type { EraSummary, Milliseconds } from '@cardano-sdk/core';

const SLOT_LENGTH_MS = 1000;

const singleEra: EraSummary[] = [
  {
    start: { slot: 0, time: new Date(0) },
    parameters: {
      epochLength: 100,
      slotLength: SLOT_LENGTH_MS as Milliseconds,
    },
  },
];

const twoEras: EraSummary[] = [
  {
    start: { slot: 0, time: new Date(0) },
    parameters: {
      epochLength: 100,
      slotLength: SLOT_LENGTH_MS as Milliseconds,
    },
  },
  {
    // Era 2 starts after 2 full epochs of era 1 (slots 0-199)
    start: { slot: 200, time: new Date(200 * SLOT_LENGTH_MS) },
    parameters: {
      epochLength: 50,
      slotLength: SLOT_LENGTH_MS as Milliseconds,
    },
  },
];

describe('calculateEpochFromSlot', () => {
  it('returns epoch 0 for slot 0 in a single era', () => {
    expect(calculateEpochFromSlot(Cardano.Slot(0), singleEra)).toBe(0);
  });

  it('returns epoch 0 for the last slot of epoch 0', () => {
    expect(calculateEpochFromSlot(Cardano.Slot(99), singleEra)).toBe(0);
  });

  it('returns epoch 1 for the first slot of epoch 1', () => {
    expect(calculateEpochFromSlot(Cardano.Slot(100), singleEra)).toBe(1);
  });

  it('returns epoch 5 for slot 500 in a single era', () => {
    expect(calculateEpochFromSlot(Cardano.Slot(500), singleEra)).toBe(5);
  });

  it('returns epoch 2 in second era (slot 200, era 2 epoch 0 → overall epoch 2)', () => {
    expect(calculateEpochFromSlot(Cardano.Slot(200), twoEras)).toBe(2);
  });

  it('returns epoch 3 for slot 250 (era 2 epoch 1 → overall epoch 3)', () => {
    expect(calculateEpochFromSlot(Cardano.Slot(250), twoEras)).toBe(3);
  });
});

describe('calculateEpochEnd', () => {
  it('returns the start time of the next epoch', () => {
    // Epoch 0 ends at slot 100; slot 100 * 1000ms = 100000ms from epoch
    const result = calculateEpochEnd(Cardano.EpochNo(0), singleEra);
    expect(result).toBeInstanceOf(Date);
    expect(result.getTime()).toBe(100 * SLOT_LENGTH_MS);
  });

  it('returns the correct end time for epoch 1', () => {
    const result = calculateEpochEnd(Cardano.EpochNo(1), singleEra);
    expect(result.getTime()).toBe(200 * SLOT_LENGTH_MS);
  });
});
