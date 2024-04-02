import { Wallet } from '@lace/cardano';

export const fetchPoolsInfo = async ({
  searchString = '',
  stakePoolProvider
}: {
  searchString: string;
  stakePoolProvider: Wallet.StakePoolProvider;
}): Promise<Wallet.StakePoolSearchResults['pageResults']> => {
  const filters: Wallet.QueryStakePoolsArgs = {
    filters: {
      ...(searchString && {
        identifier: {
          _condition: 'or',
          values: [{ name: searchString }, { ticker: searchString }, { id: Wallet.Cardano.PoolId(searchString) }]
        }
      }),
      pledgeMet: true,
      status: [
        Wallet.Cardano.StakePoolStatus.Active,
        Wallet.Cardano.StakePoolStatus.Activating,
        Wallet.Cardano.StakePoolStatus.Retiring
      ]
    },
    pagination: {
      startAt: 0,
      limit: 100
    }
  };
  const { pageResults: pools } = await stakePoolProvider.queryStakePools(filters);

  return pools;
};
