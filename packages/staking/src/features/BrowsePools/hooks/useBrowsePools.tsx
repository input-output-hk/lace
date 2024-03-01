import { PostHogAction } from '@lace/common';
import { StateStatus, useOutsideHandles } from 'features/outside-handles-provider';
import { mapStakePoolToDisplayData } from 'features/store';
import debounce from 'lodash/debounce';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_SORT_OPTIONS, SEARCH_DEBOUNCE_IN_MS } from '../constants';
import { StakePoolsListProps } from '../StakePoolsList';
import { StakePoolSortOptions } from '../types';

export const useBrowsePools = () => {
  const {
    currentChain,
    walletStoreStakePoolSearchResults: { pageResults, totalResultCount },
    walletStoreStakePoolSearchResultsStatus,
    walletStoreResetStakePools: resetStakePools,
    walletStoreFetchStakePools: fetchStakePools,
    analytics,
    stakingBrowserPreferencesPersistence,
  } = useOutsideHandles();
  // TODO idea:
  // const { sort, setSort, searchValue, setSearchValue } = useDelegationPortfolioStore(state => state.mutators);
  const debouncedSearch = useMemo(() => debounce(fetchStakePools, SEARCH_DEBOUNCE_IN_MS), [fetchStakePools]);
  const [searchValue, setSearchValue] = useState<string>(stakingBrowserPreferencesPersistence?.searchQuery || '');
  const [sort, setSort] = useState<StakePoolSortOptions>(
    stakingBrowserPreferencesPersistence?.sortOptions || DEFAULT_SORT_OPTIONS
  );

  const loadMoreData = useCallback(
    ({ startIndex, endIndex }: Parameters<StakePoolsListProps['loadMoreData']>[0]) => {
      if (startIndex !== endIndex) {
        debouncedSearch({ limit: endIndex, searchString: searchValue, skip: startIndex, sort });
      }
    },
    [debouncedSearch, searchValue, sort]
  );

  const onSearch = useCallback(
    (searchString: string) => {
      const startedTyping = searchValue === '' && searchString !== '';
      if (startedTyping) {
        analytics.sendEventToPostHog(PostHogAction.StakingBrowsePoolsSearchClick);
      }
      setSearchValue(searchString);
    },
    [analytics, searchValue]
  );

  const list = useMemo(
    () => pageResults.map((pool) => (pool ? mapStakePoolToDisplayData({ stakePool: pool }) : undefined)),
    [pageResults]
  );

  useEffect(() => {
    resetStakePools?.();
  }, [currentChain, searchValue, sort, resetStakePools]);

  return useMemo(
    () => ({
      fetchingPools: walletStoreStakePoolSearchResultsStatus === StateStatus.LOADING,
      list,
      loadMoreData,
      onSearch,
      searchValue,
      setSort,
      sort,
      totalResultCount,
    }),
    [
      walletStoreStakePoolSearchResultsStatus,
      list,
      loadMoreData,
      onSearch,
      searchValue,
      setSort,
      sort,
      totalResultCount,
    ]
  );
};
