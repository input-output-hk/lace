import { describe, expect, it } from 'vitest';

import { estimateStakePoolROS, estimateSummaryROS } from '../src/estimate-ros';

import type { StakePoolsNetworkData } from '../src/types';

// Plausible mainnet-scale figures; the exhaustive numeric pinning lives in
// staking-center's estimateROS tests, which exercise this same core through
// the details-screen wrapper. These tests pin the CONTRACT of the two entry
// points, not the ledger math.
const networkData: StakePoolsNetworkData = {
  activeSlotsCoefficient: 0.05,
  desiredNumberOfPools: 500,
  epochLength: 432_000,
  liveStake: 22_000_000_000_000_000,
  maxLovelaceSupply: 45_000_000_000_000_000,
  monetaryExpansion: '0.003',
  poolInfluence: '0.3',
  reserves: 7_000_000_000_000_000,
  retiringPools: [],
  slotLength: 1,
  treasuryCut: 0.2,
} as unknown as StakePoolsNetworkData;

const pool = {
  blocks: 1000,
  cost: 170_000_000,
  declaredPledge: 100_000_000_000,
  livePledge: 100_000_000_000,
  liveStake: 40_000_000_000_000,
  margin: 0.02,
};

describe('estimateStakePoolROS', () => {
  it('estimates a positive annual fraction for a healthy pool', () => {
    const ros = estimateStakePoolROS(pool, networkData);
    expect(ros).toBeGreaterThan(0);
    // A fraction, not a percent: 100%/yr staking returns do not exist.
    expect(ros).toBeLessThan(1);
  });

  /**
   * The persisted-state case, and the one that shipped a screen of `~NaN%`:
   * `networkData` is cached across upgrades, so a payload written before
   * `treasuryCut` existed reaches this code with the field absent. No
   * arithmetic rejects NaN, so without this guard every pool renders a
   * non-number at once.
   */
  it('returns 0 when a persisted payload predates a reward parameter', () => {
    const stale = { ...networkData } as Partial<StakePoolsNetworkData>;
    delete stale.treasuryCut;

    expect(estimateStakePoolROS(pool, stale as StakePoolsNetworkData)).toBe(0);
  });

  it('returns 0 rather than NaN when a reward parameter is not a number', () => {
    expect(
      estimateStakePoolROS(pool, {
        ...networkData,
        maxLovelaceSupply: Number.NaN,
      }),
    ).toBe(0);
  });

  it('returns 0 when the live pledge is below the declared pledge', () => {
    expect(estimateStakePoolROS({ ...pool, livePledge: 1 }, networkData)).toBe(
      0,
    );
  });

  it('returns 0 for an empty pool rather than dividing by zero', () => {
    expect(estimateStakePoolROS({ ...pool, liveStake: 0 }, networkData)).toBe(
      0,
    );
  });

  it('returns 0 when the network total stake is unknown', () => {
    expect(
      estimateStakePoolROS(pool, {
        ...networkData,
        liveStake: 0,
      } as typeof networkData),
    ).toBe(0);
  });

  // The zero-rate outcome small pools actually hit: the epoch's rewards do not
  // clear the fixed cost, so members earn nothing. The list renders "~0%" for
  // these — a true figure, not a missing one.
  it('returns 0 when rewards cannot clear the pool cost', () => {
    expect(
      estimateStakePoolROS(
        { ...pool, cost: 45_000_000_000_000_000, blocks: 1 },
        networkData,
      ),
    ).toBe(0);
  });
});

describe('estimateSummaryROS', () => {
  /**
   * Zero and absent say different things on a card: `~0%` asserts the pool earns
   * its members nothing, `—` admits we cannot tell. Returning 0 for a payload
   * the maths cannot use prints a concrete wrong figure against every pool at
   * once, while the ranking declines to score the same payload — the two have to
   * agree.
   */
  it('declines rather than reporting zero when the payload cannot support it', () => {
    const stale = { ...networkData } as Partial<StakePoolsNetworkData>;
    delete stale.treasuryCut;

    expect(
      estimateSummaryROS(pool, stale as StakePoolsNetworkData),
    ).toBeUndefined();
    expect(estimateSummaryROS(pool, networkData)).toBeGreaterThan(0);
  });

  /**
   * The summary path substitutes the declared pledge for the live pledge the
   * bulk API does not carry. When the two are equal — the honest operator, and
   * the only case the substitute can be checked against — the estimate must be
   * IDENTICAL to the full computation, so the list's figure never silently
   * diverges from the details screen's for the same inputs.
   */
  it('matches the full estimate when live pledge equals declared pledge', () => {
    expect(estimateSummaryROS(pool, networkData)).toBe(
      estimateStakePoolROS(pool, networkData),
    );
  });

  // The substitution's known limitation, pinned so it is a decision and not an
  // accident: a pledge-broken pool (live < declared) reads as healthy from the
  // summary, because the summary cannot see the live pledge at all.
  it('cannot detect a broken pledge, by construction', () => {
    const broken = { ...pool, livePledge: 1 };
    expect(estimateStakePoolROS(broken, networkData)).toBe(0);
    expect(estimateSummaryROS(broken, networkData)).toBeGreaterThan(0);
  });
});
