import { Wallet } from '@lace/cardano';
import { getQueryStakePoolsFilters } from '@src/stores/slices';

export const fetchPoolsInfo = async ({
  searchString = '',
  stakePoolProvider
}: {
  searchString: string;
  stakePoolProvider: Wallet.StakePoolProvider;
}): Promise<Wallet.StakePoolSearchResults['pageResults']> => {
  const filters = getQueryStakePoolsFilters({ searchString });

  const { pageResults: pools } = await stakePoolProvider.queryStakePools(filters);

  return pools;
};
