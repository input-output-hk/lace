import { Wallet } from '@lace/cardano';

export const getPoolInfos = async (poolIds: Wallet.Cardano.PoolId[], stakePoolProvider: Wallet.StakePoolProvider) => {
  if (poolIds.length === 0) return [];

  const filters: Wallet.QueryStakePoolsArgs = {
    filters: {
      identifier: {
        _condition: 'or',
        values: poolIds.map((poolId) => ({ id: poolId })),
      },
    },
    pagination: {
      limit: poolIds.length,
      startAt: 0,
    },
  };
  const { pageResults: pools } = await stakePoolProvider.queryStakePools(filters);

  return pools;
};
