import { PostHogAction } from '@lace/common';
import { StateStatus, useOutsideHandles } from 'features/outside-handles-provider';
import { mapStakePoolToDisplayData, useDelegationPortfolioStore } from 'features/store';
import debounce from 'lodash/debounce';
import { useCallback, useMemo } from 'react';
import { DEFAULT_SORT_OPTIONS, SEARCH_DEBOUNCE_IN_MS } from '../constants';
import { StakePoolsListProps } from '../StakePoolsList';
import { StakePoolSortOptions } from '../types';

export const useQueryStakePools = () => {
  const portfolioMutators = useDelegationPortfolioStore((s) => s.mutators);
  const {
    walletStoreStakePoolSearchResults: { pageResults, totalResultCount: totalPoolsCount },
    walletStoreStakePoolSearchResultsStatus,
    walletStoreFetchStakePools: fetchStakePools,
    analytics,
  } = useOutsideHandles();

  const { searchQuery, sortField, sortOrder } = useDelegationPortfolioStore((store) => ({
    searchQuery: store.searchQuery,
    sortField: store.sortField ?? DEFAULT_SORT_OPTIONS.field,
    sortOrder: store.sortOrder ?? DEFAULT_SORT_OPTIONS.order,
  }));

  const debouncedSearch = useMemo(() => debounce(fetchStakePools, SEARCH_DEBOUNCE_IN_MS), [fetchStakePools]);

  const fetchPoolsByRange = useCallback(
    ({ startIndex, endIndex }: Parameters<StakePoolsListProps['loadMoreData']>[0]) => {
      if (startIndex !== endIndex) {
        debouncedSearch({
          limit: endIndex,
          searchString: searchQuery ?? '',
          skip: startIndex,
          sort: { field: sortField, order: sortOrder },
        });
      }
    },
    [debouncedSearch, searchQuery, sortField, sortOrder]
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

  const pools = useMemo(
    () => pageResults.map((pool) => (pool ? mapStakePoolToDisplayData({ stakePool: pool }) : undefined)),
    [pageResults]
  );

  const setSort = useCallback(
    (data: StakePoolSortOptions) =>
      portfolioMutators.executeCommand({
        data,
        type: 'SetSort',
      }),
    [portfolioMutators]
  );

  return useMemo(
    () => ({
      fetchPoolsByRange,
      loading: walletStoreStakePoolSearchResultsStatus === StateStatus.LOADING,
      pools,
      searchQuery,
      setSearchQuery,
      setSort,
      sort: {
        field: sortField,
        order: sortOrder,
      },
      totalPoolsCount,
    }),
    [
      walletStoreStakePoolSearchResultsStatus,
      pools,
      fetchPoolsByRange,
      setSearchQuery,
      searchQuery,
      setSort,
      sortField,
      sortOrder,
      totalPoolsCount,
    ]
  );
};
