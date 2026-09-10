import { describe, expect, it } from 'vitest';

import { rankPoolsByNonMyopicReward } from '../src/rank-pools';

import type { RankedPoolInput } from '../src/rank-pools';
import type { StakePoolsNetworkData } from '../src/types';
import type { Cardano } from '@cardano-sdk/core';

// Mainnet-scale figures. `desiredNumberOfPools` is deliberately small so the
// top-`k` cutoff can be exercised with a handful of pools. The ranking measures
// relative stake against ada in CIRCULATION (`maxLovelaceSupply - reserves`,
// i.e. 20e15 here), so the pool sizes below keep their intended relationship to
// the saturation point.
const networkData = {
  desiredNumberOfPools: 3,
  liveStake: 20_000_000_000_000_000,
  maxLovelaceSupply: 27_000_000_000_000_000,
  monetaryExpansion: '0.003',
  poolInfluence: '0.3',
  reserves: 7_000_000_000_000_000,
  treasuryCut: 0.2,
} as unknown as StakePoolsNetworkData;

const pool = (
  poolId: Cardano.PoolId | string,
  overrides: Partial<RankedPoolInput> = {},
): RankedPoolInput => ({
  poolId: poolId as Cardano.PoolId,
  cost: 170_000_000,
  margin: 0.02,
  declaredPledge: 1_000_000_000_000,
  // A twentieth of total stake, which with k=3 is well under saturation.
  liveStake: 1_000_000_000_000_000,
  ...overrides,
});

const rank = (pools: RankedPoolInput[], data = networkData) =>
  rankPoolsByNonMyopicReward(pools, data);

const order = (pools: RankedPoolInput[], data = networkData) =>
  [...rank(pools, data).entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([poolId]) => poolId);

describe('rankPoolsByNonMyopicReward', () => {
  it('scores every pool it is given', () => {
    const scores = rank([pool('a'), pool('b')]);
    expect([...scores.keys()].sort()).toEqual(['a', 'b']);
  });

  // The naïve ordering this replaces: a pool with a tiny live stake divides the
  // same rewards among fewer delegators, so its CURRENT rate looks unbeatable.
  // Judged at the stake it would hold, it has no such advantage.
  it('does not favour a pool merely for holding little stake', () => {
    const tiny = pool('tiny', { liveStake: 1_000_000_000 });
    const ordinary = pool('ordinary');
    const scores = rank([tiny, ordinary]);
    expect(scores.get('tiny')).toBeCloseTo(scores.get('ordinary')!, 12);
  });

  it('ranks a cheaper pool above a costlier one, all else equal', () => {
    expect(
      order([pool('dear', { cost: 5_000_000_000 }), pool('cheap')]),
    ).toEqual(['cheap', 'dear']);
  });

  it('ranks a lower margin above a higher one, all else equal', () => {
    expect(order([pool('greedy', { margin: 0.5 }), pool('fair')])).toEqual([
      'fair',
      'greedy',
    ]);
  });

  // Pledge is the operator's own stake at risk, and the protocol pays for it
  // through the influence factor a0.
  it('ranks a higher pledge above a lower one, all else equal', () => {
    expect(
      order([pool('thin', { declaredPledge: 0 }), pool('committed')]),
    ).toEqual(['committed', 'thin']);
  });

  // Past saturation the same rewards spread over more stake, so each member's
  // share falls — the dilution the naïve rate cannot express.
  it('penalises a pool already past saturation', () => {
    const saturated = pool('saturated', {
      // k=3 puts saturation at a third of total stake; hold two thirds.
      liveStake: 13_000_000_000_000_000,
    });
    const scores = rank([saturated, pool('ordinary')]);
    expect(scores.get('saturated')!).toBeLessThan(scores.get('ordinary')!);
  });

  /**
   * A pool outside the desired `k` is priced at its pledge alone: non-myopically
   * it is not expected to attract stake, so its members would be funding a pool
   * the protocol is not trying to fill.
   */
  it('prices pools outside the desired count at their pledge alone', () => {
    const pools = ['a', 'b', 'c', 'd'].map(id => pool(id));
    const scores = rank(pools);
    const values = [...scores.values()];
    // Three in, one out: the outsider is scored differently from the rest,
    // which are identical.
    const distinct = new Set(values.map(value => value.toFixed(12)));
    expect(distinct.size).toBe(2);
  });

  it('scores a pool whose rewards cannot cover its cost at zero', () => {
    const scores = rank([
      pool('unaffordable', { cost: Number.MAX_SAFE_INTEGER }),
    ]);
    expect(scores.get('unaffordable')).toBe(0);
  });

  /**
   * Both guard the arithmetic: `1/k` and every relative stake are undefined
   * without them, and a half-loaded network snapshot does reach this code.
   *
   * Circulating supply, NOT the delegated total, is what the guard has to
   * watch — the same distinction the scoring rests on. A snapshot whose
   * reserves have arrived but whose supply has not would otherwise put a
   * negative total into every division.
   */
  it('returns nothing when the network data cannot support a ranking', () => {
    expect(
      rank([pool('a')], {
        ...networkData,
        maxLovelaceSupply: 0,
      } as StakePoolsNetworkData).size,
    ).toBe(0);
    expect(
      rank([pool('a')], {
        ...networkData,
        desiredNumberOfPools: 0,
      } as StakePoolsNetworkData).size,
    ).toBe(0);
  });

  /**
   * Worse than a wrong score: a NaN one. `networkData` is persisted, so a
   * payload from before `treasuryCut` existed makes every score NaN, and a
   * comparator over NaN is inconsistent — the list's order becomes arbitrary
   * rather than merely mis-ranked. Scoring nothing leaves the pools unscored,
   * which the list already sinks to the end in a defined order.
   */
  it('scores nothing when a persisted payload predates a reward parameter', () => {
    const stale = { ...networkData } as Partial<StakePoolsNetworkData>;
    delete stale.treasuryCut;

    expect(
      rank([pool('a'), pool('b')], stale as StakePoolsNetworkData).size,
    ).toBe(0);
  });

  it('scores a pool with neither stake nor pledge at zero rather than dividing by it', () => {
    const scores = rank([
      pool('empty', { liveStake: 0, declaredPledge: 0 }),
      pool('a'),
      pool('b'),
      pool('c'),
    ]);
    expect(scores.get('empty')).toBe(0);
  });
});
