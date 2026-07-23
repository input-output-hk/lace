import { Cardano, Milliseconds } from '@cardano-sdk/core';
import { describe, it, expect } from 'vitest';

import { getEpochFirstSlot } from '../../../src/store/helpers/get-epoch-first-slot';

import type { EraSummary } from '@cardano-sdk/core';

// slotLength / start.time are irrelevant to getEpochFirstSlot — only start.slot
// and epochLength drive the epoch->slot walk.
const era = (slot: number, epochLength: number): EraSummary => ({
  parameters: { epochLength, slotLength: Milliseconds(1000) },
  start: { slot, time: new Date(0) },
});

// Byron (21600-slot epochs from slot 0) then Shelley (432000-slot epochs).
const MAINNET_ERAS: EraSummary[] = [era(0, 21600), era(4492800, 432000)]; // Shelley at epoch 208
const PREPROD_ERAS: EraSummary[] = [era(0, 21600), era(86400, 432000)]; // Shelley at epoch 4
const SINGLE_ERA: EraSummary[] = [era(0, 432000)];

describe('getEpochFirstSlot', () => {
  it('returns the first era start slot for epoch 0', () => {
    expect(getEpochFirstSlot(Cardano.EpochNo(0), MAINNET_ERAS)).toBe(0);
  });

  it('walks within the first era', () => {
    expect(getEpochFirstSlot(Cardano.EpochNo(1), MAINNET_ERAS)).toBe(21600);
    expect(getEpochFirstSlot(Cardano.EpochNo(100), MAINNET_ERAS)).toBe(2160000);
  });

  it('lands exactly on an era boundary (first Shelley epoch)', () => {
    // 208 Byron epochs * 21600 = 4,492,800 = Shelley start slot
    expect(getEpochFirstSlot(Cardano.EpochNo(208), MAINNET_ERAS)).toBe(4492800);
  });

  it('walks into a later era with a different epoch length', () => {
    // 4,492,800 + (639 - 208) * 432000
    expect(getEpochFirstSlot(Cardano.EpochNo(639), MAINNET_ERAS)).toBe(
      190684800,
    );
  });

  it('uses the era layout it is given — preprod differs from mainnet for the same epoch', () => {
    // preprod has 4 Byron epochs, then Shelley at slot 86400
    expect(getEpochFirstSlot(Cardano.EpochNo(4), PREPROD_ERAS)).toBe(86400);
    expect(getEpochFirstSlot(Cardano.EpochNo(639), PREPROD_ERAS)).toBe(
      274406400,
    );
  });

  it('handles single-era summaries', () => {
    expect(getEpochFirstSlot(Cardano.EpochNo(3), SINGLE_ERA)).toBe(1296000);
  });
});
