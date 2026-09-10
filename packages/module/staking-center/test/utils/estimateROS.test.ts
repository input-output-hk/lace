/**
 * Real mainnet pool data (epoch ~500), originally taken from IOG Lace v1's
 * `stakePoolService.ros.test.ts` as a parity fixture.
 *
 * The expectations DELIBERATELY no longer match v1's. Our estimate corrects two
 * deviations from the ledger that v1's shares, and both corrections lower the
 * figure — together by about a third for a saturated pool, and by more for one
 * short of saturation:
 *
 * 1. `sigma` is relative to the ada in CIRCULATION, not to the amount
 *    delegated. `saturationMatchesBlockfrost` below proves the basis: it
 *    reproduces Blockfrost's own `live_saturation` field exactly, which the
 *    delegated basis misses by ~1.74x.
 * 2. The treasury takes `tau` of the pot before pools are paid.
 *
 * The corrected figures also agree with the outside world, which is the reason
 * to trust them over a parity check against code sharing our own lineage: a
 * saturated zero-margin pool comes out at ~2.5%/yr here, and PoolTool's
 * measured two-month ROS for real mainnet pools sits at 2.0–2.6%. The old
 * figures (3.1–3.7%) were above every pool on that list.
 */
import { Cardano } from '@cardano-sdk/core';
import { toLaceStakePool } from '@lace-contract/cardano-stake-pools';
import { describe, expect, it } from 'vitest';

import { estimateROS } from '../../src/utils/estimateROS';

import {
  laceRosPoolFixtures,
  laceRosStakePoolsNetworkData,
} from './estimateRos.fixtures';

const toPool = (
  poolId: string,
  blockfrost: (typeof laceRosPoolFixtures)[number]['blockfrost'],
) =>
  toLaceStakePool({
    poolId: Cardano.PoolId(poolId),
    pool: blockfrost,
    metadata: null,
    retiringPools: [],
    now: () => 0,
  });

describe('estimateROS', () => {
  it.each(laceRosPoolFixtures)(
    '$poolId',
    ({ poolId, expectedRos, blockfrost }) => {
      const result = estimateROS(
        toPool(poolId, blockfrost),
        laceRosStakePoolsNetworkData,
      );

      expect(result?.ros).toBeCloseTo(expectedRos, 10);
    },
  );

  /**
   * The load-bearing check on the stake basis, and the one that would have
   * caught the original error: Blockfrost publishes each pool's saturation, so
   * the denominator is not a matter of opinion. Reproducing it to 6 decimals
   * from `maxLovelaceSupply - reserves` over `k` is proof the reward
   * calculation is measuring against the same total the network does.
   */
  it('derives each pool saturation exactly as Blockfrost reports it', () => {
    const { maxLovelaceSupply, reserves, desiredNumberOfPools } =
      laceRosStakePoolsNetworkData;
    const saturationPoint =
      (maxLovelaceSupply - reserves) / desiredNumberOfPools;

    for (const { blockfrost } of laceRosPoolFixtures) {
      expect(Number(blockfrost.live_stake) / saturationPoint).toBeCloseTo(
        blockfrost.live_saturation,
        6,
      );
    }
  });

  /**
   * A magnitude guard, not a restatement of the per-pool expectations: it fails
   * if a future change re-inflates the estimate the way the two corrected bugs
   * did. The band is anchored outside this repo — PoolTool's measured two-month
   * ROS for real mainnet pools — so a plausible-looking regression cannot pass
   * by moving a fixture with it.
   */
  it('estimates a plausible rate for pools at saturation', () => {
    const nearlySaturated = laceRosPoolFixtures.filter(
      ({ blockfrost }) =>
        blockfrost.live_saturation > 0.95 &&
        blockfrost.live_saturation < 1.05 &&
        blockfrost.margin_cost === 0,
    );
    expect(nearlySaturated.length).toBeGreaterThan(2);

    for (const { poolId, blockfrost } of nearlySaturated) {
      const ros = estimateROS(
        toPool(poolId, blockfrost),
        laceRosStakePoolsNetworkData,
      )?.ros;
      expect(ros).toBeGreaterThan(0.015);
      expect(ros).toBeLessThan(0.03);
    }
  });
});
