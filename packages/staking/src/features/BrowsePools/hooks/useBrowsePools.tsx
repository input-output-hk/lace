import { PostHogAction } from '@lace/common';
import { StateStatus, useOutsideHandles } from 'features/outside-handles-provider';
import { mapStakePoolToDisplayData, useDelegationPortfolioStore } from 'features/store';
import debounce from 'lodash/debounce';
import { useCallback, useMemo } from 'react';
import { DEFAULT_SORT_OPTIONS, SEARCH_DEBOUNCE_IN_MS } from '../constants';
import { StakePoolsListProps } from '../StakePoolsList';
import { BrowsePoolsView, StakePoolSortOptions } from '../types';

export const useBrowsePools = () => {
  const portfolioMutators = useDelegationPortfolioStore((s) => s.mutators);
  const {
    walletStoreStakePoolSearchResults: { pageResults, totalResultCount: totalPoolsCount },
    walletStoreStakePoolSearchResultsStatus,
    walletStoreFetchStakePools: fetchStakePools,
    analytics,
    setStakingBrowserPreferencesPersistence,
  } = useOutsideHandles();

  const { poolsView, searchQuery, sortField, sortOrder } = useDelegationPortfolioStore((store) => ({
    poolsView: store.browsePoolsView || BrowsePoolsView.table,
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

  const switchPoolsView = useCallback(() => {
    const newView = poolsView === BrowsePoolsView.table ? BrowsePoolsView.grid : BrowsePoolsView.table;
    setStakingBrowserPreferencesPersistence({
      poolsView: newView,
    });
    portfolioMutators.executeCommand({
      data: newView,
      type: 'SetBrowsePoolsView',
    });
  }, [poolsView, portfolioMutators, setStakingBrowserPreferencesPersistence]);

  return useMemo(
    () => ({
      fetchPoolsByRange,
      loading: walletStoreStakePoolSearchResultsStatus === StateStatus.LOADING,
      pools,
      poolsView,
      searchQuery,
      setSearchQuery,
      setSort,
      sort: {
        field: sortField,
        order: sortOrder,
      },
      switchPoolsView,
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
      switchPoolsView,
      totalPoolsCount,
      poolsView,
    ]
  );
};
