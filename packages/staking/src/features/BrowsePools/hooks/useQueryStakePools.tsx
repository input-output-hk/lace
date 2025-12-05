import { QueryStakePoolsArgs } from '@cardano-sdk/core';
import { PostHogAction, logger } from '@lace/common';
import { useOutsideHandles } from 'features/outside-handles-provider';
import { StakePoolDetails, mapStakePoolToDisplayData, useDelegationPortfolioStore } from 'features/store';
import debounce from 'lodash/debounce';
import { useCallback, useMemo, useState } from 'react';
import { ListRange } from 'react-virtuoso';
import { SEARCH_DEBOUNCE_IN_MS } from '../constants';
import { StakePoolSortOptions } from '../types';

type QueryStatus = 'idle' | 'fetching' | 'paginating';

type UseQueryStakePoolsResult = {
  status: QueryStatus;
  paginatePools: (range: ListRange) => Promise<void>;
  performQuery: () => void;
  pools: (StakePoolDetails | undefined)[];
  searchQuery: string;
  setSearchQuery: (searchString: string) => void;
  setSort: (sortOptions: StakePoolSortOptions) => void;
  sort?: StakePoolSortOptions;
  totalPoolsCount: number;
};

// Pagination is no longer needed with the client side StakePoolProvider
const pagination = { limit: 100_000_000, startAt: 0 };

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

  const [pools, setPools] = useState<StakePoolDetails[]>([]);
  const [status, setStatus] = useState<'fetching' | 'idle'>('fetching');
  const [totalPoolsCount, setTotalPoolsCount] = useState<number>(0);

  const debouncedSearch = useMemo(
    () =>
      debounce((params: QueryStakePoolsArgs) => {
        stakePoolProvider
          .queryStakePools(params)
          .then(({ pageResults, totalResultCount }) => {
            setPools(pageResults.map((pool) => mapStakePoolToDisplayData({ stakePool: pool })));
            setTotalPoolsCount(totalResultCount);
            setStatus('idle');
          })
          .catch((error) => logger.error(error));
      }, SEARCH_DEBOUNCE_IN_MS),
    [stakePoolProvider]
  );

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

  const performQuery = useCallback(() => {
    setStatus('fetching');
    debouncedSearch({ filters: { pledgeMet: true, text: searchQuery }, pagination, sort });
  }, [debouncedSearch, searchQuery, sort]);

  return useMemo<UseQueryStakePoolsResult>(
    () => ({
      paginatePools: () => Promise.resolve(),
      performQuery,
      pools,
      searchQuery,
      setSearchQuery,
      setSort,
      sort,
      status,
      totalPoolsCount,
    }),
    [pools, searchQuery, setSearchQuery, sort, setSort, status, totalPoolsCount, performQuery]
  );
};
