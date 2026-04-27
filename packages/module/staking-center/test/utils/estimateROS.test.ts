/**
 * Parity tests with IOG Lace `stakePoolService.ros.test.ts` (same fixtures & expectations):
 * https://github.com/input-output-hk/lace/blob/main/v1/packages/cardano/src/wallet/lib/__tests__/stakePoolService.ros.test.ts
 */
import { Cardano } from '@cardano-sdk/core';
import { toLaceStakePool } from '@lace-contract/cardano-stake-pools';
import { describe, expect, it } from 'vitest';

import { estimateROS } from '../../src/utils/estimateROS';

import {
  laceRosPoolFixtures,
  laceRosStakePoolsNetworkData,
} from './estimateRos.fixtures';

describe('estimateROS (Lace stakePoolService ROS fixtures)', () => {
  it.each(laceRosPoolFixtures)(
    '$poolId',
    ({ poolId, expectedRos, blockfrost }) => {
      const full = toLaceStakePool({
        poolId: Cardano.PoolId(poolId),
        pool: blockfrost,
        metadata: null,
        retiringPools: [],
        now: () => 0,
      });
      const result = estimateROS(full, laceRosStakePoolsNetworkData);

      expect(result?.ros).toBeCloseTo(expectedRos, 10);
    },
  );
});
