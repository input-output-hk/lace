import { describe, expect, it } from 'vitest';

import {
  custodyExecutionEstimate,
  custodyReseedOf,
  estimateWithinLimit,
  reseededExecutionUnits,
} from '../../../src/store/custody/custody-execution-estimate';

import type { Cardano } from '@cardano-sdk/core';

const LIMIT = { memory: 14_000_000, steps: 10_000_000_000 };

describe('custodyExecutionEstimate', () => {
  it("estimates each path at twice its handlers' and its logic run's net memory, with 400 steps per memory unit", () => {
    // A revoke: the Device spend and the owner path.
    expect(custodyExecutionEstimate({ device: 1, logic: 'owner' })).toEqual({
      memory: 3_180_000,
      steps: 1_272_000_000,
    });
    // An issue: the logic checks the issued grant too.
    expect(
      custodyExecutionEstimate({ device: 1, issueGrants: 1, logic: 'owner' }),
    ).toEqual({ memory: 5_240_000, steps: 2_096_000_000 });
    // An agent spend: the logic checks every fund.
    expect(
      custodyExecutionEstimate({ spendWithGrant: 1, fund: 8, logic: 'agent' }),
    ).toEqual({ memory: 9_520_000, steps: 3_808_000_000 });
    expect(
      custodyExecutionEstimate({
        createAccount: 1,
        operate: 1,
        logic: 'arrival',
      }),
    ).toEqual({ memory: 1_500_000, steps: 600_000_000 });
  });

  it('estimates at least what upstream measured on chain for each transaction Lace builds', () => {
    // docs/devnet-evidence.md, "Execution units": the heaviest transaction
    // of each step, in memory units and CPU steps.
    const measured: [
      Parameters<typeof custodyExecutionEstimate>[0],
      Cardano.ExUnits,
    ][] = [
      [
        { createAccount: 1, operate: 1, logic: 'arrival' },
        { memory: 580_691, steps: 191_555_977 },
      ],
      [
        { device: 1, logic: 'owner' },
        { memory: 1_736_645, steps: 562_907_853 },
      ],
      [
        { device: 1, fund: 1, logic: 'owner' },
        { memory: 1_317_320, steps: 448_710_257 },
      ],
      [
        { device: 1, operate: 1, logic: 'owner' },
        { memory: 1_713_291, steps: 548_005_102 },
      ],
      [
        { device: 1, issueGrants: 1, fund: 1, logic: 'owner' },
        { memory: 2_633_401, steps: 852_324_341 },
      ],
      [
        { device: 1, sweepGrant: 8, burnGrants: 1, logic: 'owner' },
        { memory: 9_202_345, steps: 3_075_777_302 },
      ],
      [
        { spendWithGrant: 1, fund: 12, logic: 'agent' },
        { memory: 4_275_788, steps: 1_559_075_668 },
      ],
    ];
    for (const [runs, onChain] of measured) {
      const estimate = custodyExecutionEstimate(runs);
      expect(estimate.memory).toBeGreaterThanOrEqual(onChain.memory);
      expect(estimate.steps).toBeGreaterThanOrEqual(onChain.steps);
    }
  });

  it('adds every run of a handler', () => {
    const one = custodyExecutionEstimate({ device: 1, fund: 1 });
    const three = custodyExecutionEstimate({ device: 1, fund: 3 });
    const fund = custodyExecutionEstimate({ fund: 1 });
    expect(three.memory - one.memory).toBe(2 * fund.memory);
    expect(custodyExecutionEstimate({})).toEqual({ memory: 0, steps: 0 });
  });

  it('caps an estimate above the per-transaction limit at the limit', () => {
    const sweepOfEight = custodyExecutionEstimate({
      device: 1,
      sweepGrant: 8,
      burnGrants: 1,
      logic: 'owner',
    });
    expect(sweepOfEight.memory).toBeGreaterThan(LIMIT.memory);
    expect(estimateWithinLimit(sweepOfEight, LIMIT)).toEqual({
      memory: LIMIT.memory,
      steps: sweepOfEight.steps,
    });
    const revoke = custodyExecutionEstimate({ device: 1, logic: 'owner' });
    expect(estimateWithinLimit(revoke, LIMIT)).toEqual(revoke);
  });
});

describe('reseededExecutionUnits', () => {
  const reseed = custodyReseedOf(
    [
      { memory: 1_000_000, steps: 300_000_000 },
      { memory: 3_000_000, steps: 900_000_000 },
    ],
    { memory: 2_000_000, steps: 2_000_000_000 },
  );

  it('learns the measured sum, at least the seed it exceeded, and the dearest redeemer', () => {
    expect(reseed).toEqual({
      measured: { memory: 4_000_000, steps: 2_000_000_000 },
      redeemers: 2,
      dearest: { memory: 3_000_000, steps: 900_000_000 },
    });
  });

  it('seeds the measured plan at the measurement plus a tenth', () => {
    expect(reseededExecutionUnits(reseed, 2)).toEqual({
      memory: 4_400_000,
      steps: 2_200_000_000,
    });
  });

  it('prices a redeemer a later selection round adds as the dearest one measured, past the limit', () => {
    expect(reseededExecutionUnits(reseed, 5)).toEqual({
      memory: 14_300_000,
      steps: 5_170_000_000,
    });
  });
});
