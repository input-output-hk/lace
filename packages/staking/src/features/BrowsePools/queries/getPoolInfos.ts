import { Wallet } from '@lace/cardano';

export const getPoolInfos = async (poolIds: Wallet.Cardano.PoolId[], stakePoolProvider: Wallet.StakePoolProvider) => {
  const filters: Wallet.QueryStakePoolsArgs = {
    filters: {
      identifier: {
        _condition: 'or',
        values: poolIds.map((poolId) => ({ id: poolId })),
      },
    },
    pagination: {
      limit: poolIds.length - 1, // TODO test
      startAt: 0,
    },
  };
  const { pageResults: pools } = await stakePoolProvider.queryStakePools(filters);

  return pools;
};
