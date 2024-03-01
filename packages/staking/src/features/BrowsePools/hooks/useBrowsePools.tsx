import { PostHogAction } from '@lace/common';
import { StateStatus, useOutsideHandles } from 'features/outside-handles-provider';
import { mapStakePoolToDisplayData, useDelegationPortfolioStore } from 'features/store';
import debounce from 'lodash/debounce';
import { useCallback, useEffect, useMemo } from 'react';
import { DEFAULT_SORT_OPTIONS, SEARCH_DEBOUNCE_IN_MS } from '../constants';
import { StakePoolsListProps } from '../StakePoolsList';
import { BrowsePoolsView } from '../types';

export const useBrowsePools = () => {
  const portfolioMutators = useDelegationPortfolioStore((s) => s.mutators);
  const {
    currentChain,
    walletStoreStakePoolSearchResults: { pageResults, totalResultCount },
    walletStoreStakePoolSearchResultsStatus,
    walletStoreResetStakePools: resetStakePools,
    walletStoreFetchStakePools: fetchStakePools,
    analytics,
    setStakingBrowserPreferencesPersistence,
  } = useOutsideHandles();

  const { poolsView, searchQuery, sortField, sortOrder } = useDelegationPortfolioStore((store) => ({
    poolsView: store.browsePoolsView,
    searchQuery: store.searchQuery,
    sortField: store.sortField ?? DEFAULT_SORT_OPTIONS.field,
    sortOrder: store.sortOrder ?? DEFAULT_SORT_OPTIONS.order,
  }));

  const debouncedSearch = useMemo(() => debounce(fetchStakePools, SEARCH_DEBOUNCE_IN_MS), [fetchStakePools]);

  const loadMoreData = useCallback(
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

  const onSearch = useCallback(
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

  const list = useMemo(
    () => pageResults.map((pool) => (pool ? mapStakePoolToDisplayData({ stakePool: pool }) : undefined)),
    [pageResults]
  );

  useEffect(() => {
    resetStakePools?.();
  }, [currentChain, searchQuery, sortField, sortOrder, resetStakePools]);

  const setSort = useCallback(
    () => portfolioMutators.executeCommand({ type: 'CreateNewPortfolio' }),
    [portfolioMutators]
  );

  const switchView = useCallback(() => {
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
      fetchingPools: walletStoreStakePoolSearchResultsStatus === StateStatus.LOADING,
      list,
      loadMoreData,
      onSearch,
      searchValue: searchQuery,
      setSort,
      sort: {
        field: sortField,
        order: sortOrder,
      },
      switchView,
      totalResultCount,
    }),
    [
      walletStoreStakePoolSearchResultsStatus,
      list,
      loadMoreData,
      onSearch,
      searchQuery,
      setSort,
      sortField,
      sortOrder,
      switchView,
      totalResultCount,
    ]
  );
};
