import { describe, expect, it } from 'vitest';

import {
  headroomScore,
  isRecommendable,
  recommendPools,
} from '../src/recommend-pools';

import type { RecommendablePool } from '../src/recommend-pools';
import type { StakePoolsNetworkData } from '../src/types';
import type { Cardano } from '@cardano-sdk/core';

// Mainnet-scale. Relative stake is measured against ada in CIRCULATION
// (`maxLovelaceSupply - reserves` = 38e15 here), so saturation sits at 1/500th
// of that, and `liveStake` below is set as a fraction of it.
const networkData = {
  desiredNumberOfPools: 500,
  liveStake: 21_000_000_000_000_000,
  maxLovelaceSupply: 45_000_000_000_000_000,
  monetaryExpansion: '0.003',
  poolInfluence: '0.3',
  reserves: 7_000_000_000_000_000,
  treasuryCut: 0.2,
} as unknown as StakePoolsNetworkData;

const SATURATION_POINT = (45e15 - 7e15) / 500;

const pool = (
  poolId: string,
  overrides: Partial<RecommendablePool> = {},
): RecommendablePool => ({
  poolId: poolId as Cardano.PoolId,
  ticker: poolId,
  blocks: 1000,
  cost: 170_000_000,
  margin: 0.02,
  declaredPledge: 1_000_000_000_000,
  liveStake: SATURATION_POINT * 0.5,
  liveSaturation: 50,
  ...overrides,
});

/** Keeps `liveSaturation` and `liveStake` telling the same story. */
const atSaturation = (poolId: string, percent: number, rest = {}) =>
  pool(poolId, {
    liveSaturation: percent,
    liveStake: SATURATION_POINT * (percent / 100),
    ...rest,
  });

describe('headroomScore', () => {
  // The curve the recommendation design specifies, and the only component that
  // sees current saturation at all: the reward maths prices every top-k pool at
  // saturation, so without this a pool at 2% and one at 98% score identically.
  it('gives full marks across the 30-70% sweet spot', () => {
    for (const percent of [30, 45, 60, 70])
      expect(headroomScore(percent)).toBe(1);
  });

  // Not a penalty for being small so much as for paying erratically: a tiny
  // pool mints blocks rarely even when it is perfectly fair long-term.
  it('eases off below the sweet spot without zeroing', () => {
    expect(headroomScore(0)).toBeCloseTo(0.4, 6);
    expect(headroomScore(15)).toBeGreaterThan(0.4);
    expect(headroomScore(15)).toBeLessThan(1);
    expect(headroomScore(29)).toBeLessThan(1);
  });

  it('falls away steeply above the sweet spot, reaching zero at saturation', () => {
    expect(headroomScore(100)).toBe(0);
    expect(headroomScore(120)).toBe(0);
    expect(headroomScore(90)).toBeLessThan(headroomScore(80));
    // Steep, not linear: half the remaining headroom is worth far less than
    // half the score.
    expect(headroomScore(85)).toBeLessThan(headroomScore(70) / 2);
  });
});

describe('isRecommendable', () => {
  /**
   * The case that prompted this: a pool at 97.98% ranked second, because the
   * reward metric prices it at saturation and only dilutes past 100%. There is
   * no room for the delegation being made.
   */
  it('rejects a pool with no saturation headroom left', () => {
    expect(isRecommendable(atSaturation('full', 97.98), networkData)).toBe(
      false,
    );
    expect(isRecommendable(atSaturation('roomy', 60), networkData)).toBe(true);
  });

  /**
   * A pool the user cannot name cannot be evaluated. The list's comparator
   * partitions these below every identifiable pool anyway; the filter is here so
   * the SCORE agrees with the order the user is shown rather than needing to be
   * read alongside it.
   */
  it('rejects a pool with nothing identifying it', () => {
    for (const ticker of [null, '', '   ']) {
      expect(isRecommendable(pool('nameless', { ticker }), networkData)).toBe(
        false,
      );
    }
    expect(isRecommendable(pool('NAMED'), networkData)).toBe(true);
  });

  it('rejects a pool holding real stake that has never minted a block', () => {
    expect(
      isRecommendable(
        pool('abandoned', { blocks: 0, liveStake: 5e12 }),
        networkData,
      ),
    ).toBe(false);
  });

  // A new pool with no stake yet has no blocks either, and it is not abandoned.
  it('keeps a blockless pool that has no stake to have minted with', () => {
    expect(
      isRecommendable(pool('new', { blocks: 0, liveStake: 0 }), networkData),
    ).toBe(true);
  });
});

describe('recommendPools', () => {
  it('scores nothing for a pool a hard filter rejects', () => {
    const scores = recommendPools(
      [atSaturation('full', 96), atSaturation('roomy', 50)],
      networkData,
    );
    expect(scores.has('full')).toBe(false);
    expect(scores.get('roomy')).toBeGreaterThan(0);
  });

  it('scores every surviving pool within 0 and 1', () => {
    const scores = recommendPools(
      [atSaturation('a', 40), atSaturation('b', 65), atSaturation('c', 10)],
      networkData,
    );
    for (const score of scores.values()) {
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });

  /**
   * The behaviour the reward metric alone could not produce. Both pools have
   * identical fees and pledge, so their yield component ties; headroom is the
   * only thing separating them, and the roomier one must win.
   */
  it('prefers the pool with headroom when yield ties', () => {
    const scores = recommendPools(
      [atSaturation('tight', 88), atSaturation('roomy', 55)],
      networkData,
    );
    expect(scores.get('roomy')!).toBeGreaterThan(scores.get('tight')!);
  });

  /**
   * Multi-pool operators number their tickers, which is the only sibling signal
   * the bulk endpoint affords. Three pools under one family each carry a third
   * of the concentration score of a lone pool with the same economics.
   */
  it('penalises a pool whose ticker family has siblings', () => {
    const scores = recommendPools(
      [
        atSaturation('WPBJ1', 50),
        atSaturation('WPBJ2', 50),
        atSaturation('WPBJ3', 50),
        atSaturation('SOLO', 50),
      ],
      networkData,
    );
    expect(scores.get('SOLO')!).toBeGreaterThan(scores.get('WPBJ1')!);
    // Siblings are indistinguishable from each other — the penalty is the
    // family's size, not a pool's position in it.
    expect(scores.get('WPBJ1')!).toBeCloseTo(scores.get('WPBJ2')!, 12);
  });

  /**
   * A placeholder is not an identity. Measured on mainnet, `N/A` was held by 18
   * pools under 18 different reward addresses — unrelated operators who all left
   * the field blank the same way. Grouping them cost each 94% of the
   * concentration component for siblings they do not have.
   */
  it('does not treat a placeholder ticker as an operator family', () => {
    const scores = recommendPools(
      [
        atSaturation('lone', 50),
        ...['N/A', 'N/A', 'N/A', 'TBD', '-'].map((ticker, index) =>
          pool(`placeholder-${index}`, {
            ticker,
            liveSaturation: 50,
            liveStake: SATURATION_POINT * 0.5,
          }),
        ),
      ],
      networkData,
    );
    // Each placeholder pool scores as its own operator, level with a pool that
    // has a real and unique ticker.
    for (const index of [0, 1, 2, 3, 4]) {
      expect(scores.get(`placeholder-${index}`)!).toBeCloseTo(
        scores.get('lone')!,
        12,
      );
    }
  });

  // Under-penalising is the accepted failure mode: a ticker that shares no
  // prefix cannot be linked to a sibling from this data.
  it('cannot see siblings that do not share a ticker family', () => {
    const scores = recommendPools(
      [atSaturation('ALPHA', 50), atSaturation('BETA', 50)],
      networkData,
    );
    expect(scores.get('ALPHA')!).toBeCloseTo(scores.get('BETA')!, 12);
  });

  /**
   * With network data too incomplete for the reward maths, nothing is
   * recommended at all — deliberately, not as a side effect.
   *
   * The alternative is to order on the components that still compute, headroom
   * and concentration. That is exactly the failure this filter exists to
   * prevent: it would put a pool at the top of a list the wallet presents as
   * advice without any idea whether that pool pays its members anything. An
   * empty result leaves every pool unscored, which the list's comparator sinks
   * in both directions, so the list still renders in a defined order — just not
   * as a recommendation.
   */
  it('recommends nothing when the reward maths cannot be computed', () => {
    const scores = recommendPools(
      [atSaturation('a', 50), atSaturation('b', 85)],
      { ...networkData, treasuryCut: Number.NaN } as StakePoolsNetworkData,
    );
    expect(scores.size).toBe(0);
  });

  it('returns nothing when every pool is filtered out', () => {
    expect(recommendPools([atSaturation('full', 99)], networkData).size).toBe(
      0,
    );
  });
});
