import { Wallet } from '@lace/cardano';
import sortBy from 'lodash/sortBy';

export const getPoolInfos = async ({
  poolIds,
  stakePoolProvider,
  status,
  preserveOrder,
}: {
  poolIds: Wallet.Cardano.PoolId[];
  stakePoolProvider: Wallet.StakePoolProvider;
  status?: Wallet.Cardano.StakePoolStatus[];
  preserveOrder?: boolean;
}) => {
  if (poolIds.length === 0) return [];

  const filters: Wallet.QueryStakePoolsArgs = {
    filters: {
      identifier: {
        _condition: 'or',
        values: poolIds.map((poolId) => ({ id: poolId })),
      },
      status,
    },
    pagination: {
      limit: poolIds.length,
      startAt: 0,
    },
  };
  const { pageResults: pools } = await stakePoolProvider.queryStakePools(filters);

  return preserveOrder ? sortBy(pools, (pool) => poolIds.indexOf(pool.id)) : pools;
};
