/**
 * The recommended order over real recorded mainnet pools, end to end: the same
 * fixtures the ROS tests use, mapped by the same production mapper
 * (`toLacePartialStakePool`) that the browse list feeds from.
 *
 * The per-component unit tests in `@lace-contract/cardano-stake-pools` pin each
 * part of the score in isolation. They cannot catch a bad *composition* — a
 * weight that lets one component overrule the others, a filter that fires on
 * the wrong side of a threshold, a normalisation that flattens the top. Those
 * only show up as an order, over pools with real spreads of saturation, margin,
 * cost and pledge. So this asserts the order itself.
 *
 * A deliberate golden test: if a change moves these pools, the diff is the
 * review artefact. Re-baseline only after reading the new order and agreeing it
 * is better — the fixtures are real pools, so "the numbers moved" is a claim
 * about advice, not about test data.
 */
import {
  isRecommendable,
  recommendPools,
  toLacePartialStakePool,
} from '@lace-contract/cardano-stake-pools';
import { describe, expect, it } from 'vitest';

import {
  laceRosPoolFixtures,
  laceRosStakePoolsNetworkData as networkData,
} from './estimateRos.fixtures';

import type { LacePartialStakePool } from '@lace-contract/cardano-stake-pools';

/** Last 10 characters of the bech32 id — enough to identify, short enough to read. */
const tag = (poolId: string) => poolId.slice(-10);

/**
 * The recorded fixtures carry no metadata, and an unidentifiable pool is not
 * recommendable at all — so each gets a unique synthetic ticker. That keeps this
 * test about the thing it exists to measure, the ORDER, and leaves
 * identifiability and the sibling penalty to their own unit tests: unique
 * tickers mean every pool is its own operator, so concentration is 1 throughout
 * and cannot mask a yield or headroom change.
 */
const pools: LacePartialStakePool[] = laceRosPoolFixtures.map(fixture => ({
  ...toLacePartialStakePool({ ...fixture.blockfrost, metadata: null } as never),
  ticker: `T${fixture.poolId.slice(-6).toUpperCase()}`,
}));

const recommended = () => {
  const scores = recommendPools(pools, networkData);
  return [...scores.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([poolId]) => tag(poolId));
};

const find = (suffix: string) =>
  pools.find(pool => pool.poolId.endsWith(suffix))!;

describe('recommended order over real mainnet pools', () => {
  it('ranks them in this order', () => {
    expect(recommended()).toEqual([
      '0t9krw62tm', // 75.6% saturated, 10% margin — real stake, real headroom
      'q98g4404up', // 3.0% saturated, 1% margin
      'zn3wjxudvr', // near-empty, 1.5% margin
      'hj87mw6ug8', // near-empty, 2% margin
      'wehk9c70eu', // near-empty, 4% margin
      'fkhq0fl9am', // near-empty, 6% margin
      'l7pcm5tprc', // 0% margin, but a 2,500 ADA fixed cost
      'mp6x6weca3', // 18.2% saturated, 25% margin
      '9rh23349j5', // 15% margin
      'kek7pkxtgp', // 50% margin
      'mxxzdwvcre', // 90% margin — last, and only just recommendable
    ]);
  });

  // The properties the order has to satisfy, stated independently of it: if the
  // golden list above is ever re-baselined, these still hold the line.
  describe('regardless of the exact order', () => {
    it('recommends no pool without saturation headroom', () => {
      for (const tagged of recommended()) {
        expect(find(tagged).liveSaturation).toBeLessThan(95);
      }
    });

    /**
     * A pool whose margin and fixed cost consume every reward pays its
     * delegators nothing. Yield is one weighted component of three, so such a
     * pool once kept ~47% of a perfect score from headroom and concentration
     * alone — mid-table here, and first when yields compress. It has to be
     * disqualified, not merely scored low.
     */
    it('recommends no pool that pays its members nothing', () => {
      const gouging = pools.filter(pool => pool.margin >= 0.999);
      expect(gouging.length).toBeGreaterThan(0);
      for (const pool of gouging) {
        expect(isRecommendable(pool, networkData)).toBe(false);
        expect(recommended()).not.toContain(tag(pool.poolId));
      }
    });

    // The list's whole purpose: a pool on reasonable terms must beat one that
    // takes almost everything, whatever else differs between them.
    it('ranks a modest-margin pool above a near-total-margin one', () => {
      const order = recommended();
      expect(order.indexOf('0t9krw62tm')).toBeLessThan(
        order.indexOf('mxxzdwvcre'),
      );
      expect(order.indexOf('mp6x6weca3')).toBeLessThan(
        order.indexOf('kek7pkxtgp'),
      );
    });

    it('leaves every unrecommendable pool unscored rather than badly scored', () => {
      const scored = new Set(recommended());
      const rejected = pools.filter(
        pool => !isRecommendable(pool, networkData),
      );
      expect(rejected.length).toBeGreaterThan(0);
      for (const pool of rejected)
        expect(scored.has(tag(pool.poolId))).toBe(false);
    });
  });
});
