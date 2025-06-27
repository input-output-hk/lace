import { PostHogAction } from '@lace/common';
import { useOutsideHandles } from 'features/outside-handles-provider';
import { StakePoolDetails, mapStakePoolToDisplayData, useDelegationPortfolioStore } from 'features/store';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ListRange } from 'react-virtuoso';
import { StakePoolSortOptions } from '../types';

type QueryStatus = 'idle' | 'fetching' | 'paginating';

type UseQueryStakePoolsResult = {
  status: QueryStatus;
  paginatePools: (range: ListRange) => Promise<void>;
  pools: (StakePoolDetails | undefined)[];
  searchQuery: string;
  setSearchQuery: (searchString: string) => void;
  setSort: (sortOptions: StakePoolSortOptions) => void;
  sort?: StakePoolSortOptions;
  totalPoolsCount: number;
};

export const useQueryStakePools = () => {
  const portfolioStore = useDelegationPortfolioStore();
  const { portfolioMutators, searchQuery, sort } = useMemo(() => {
    const { mutators, searchQuery: searchQueryStore, sortField, sortOrder } = portfolioStore;

    return {
      portfolioMutators: mutators,
      searchQuery: searchQueryStore || '',
      sort: sortField && sortOrder && { field: sortField, order: sortOrder },
    };
  }, [portfolioStore]);

  const {
    analytics,
    walletStoreBlockchainProvider: { stakePoolProvider },
  } = useOutsideHandles();

  const [pools, setPools] = useState<StakePoolDetails[]>(Array.from({ length: 100 }));
  const [status, setStatus] = useState<'fetching' | 'idle'>('fetching');
  const [totalPoolsCount, setTotalPoolsCount] = useState<number>(0);

  const setSearchQuery = useCallback(
    (searchString: string) => {
      const startedTyping = searchQuery === '' && searchString !== '';
      if (startedTyping) {
        analytics.sendEventToPostHog(PostHogAction.StakingBrowsePoolsSearchClick);
      }
      portfolioMutators.executeCommand({
        data: searchString,
        type: 'SetSearchQuery',
      });
    },
    [analytics, portfolioMutators, searchQuery]
  );

  const setSort = useCallback(
    (data: StakePoolSortOptions) =>
      portfolioMutators.executeCommand({
        data,
        type: 'SetSort',
      }),
    [portfolioMutators]
  );

  useEffect(() => {
    setStatus('fetching');
    stakePoolProvider
      .queryStakePools({
        filters: { pledgeMet: true, text: searchQuery },
        pagination: { limit: 100_000_000, startAt: 0 },
        sort,
      })
      .then(({ pageResults, totalResultCount }) => {
        setPools(pageResults.map((pool) => mapStakePoolToDisplayData({ stakePool: pool })));
        setTotalPoolsCount(totalResultCount);
        setStatus('idle');
      })
      .catch((error) => console.error(error));
  }, [searchQuery, sort, stakePoolProvider]);

  return useMemo<UseQueryStakePoolsResult>(
    () => ({
      paginatePools: () => Promise.resolve(),
      pools,
      searchQuery,
      setSearchQuery,
      setSort,
      sort,
      status,
      totalPoolsCount,
    }),
    [pools, searchQuery, setSearchQuery, sort, setSort, status, totalPoolsCount]
  );
};
