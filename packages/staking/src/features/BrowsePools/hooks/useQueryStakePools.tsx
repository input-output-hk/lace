import { PostHogAction } from '@lace/common';
import { StateStatus, useOutsideHandles } from 'features/outside-handles-provider';
import { StakePoolDetails, mapStakePoolToDisplayData, useDelegationPortfolioStore } from 'features/store';
import debounce from 'lodash/debounce';
import isEqual from 'lodash/isEqual';
import { useCallback, useMemo, useRef } from 'react';
import { ListRange } from 'react-virtuoso';
import { DEFAULT_SORT_OPTIONS, SEARCH_DEBOUNCE_IN_MS } from '../constants';
import { StakePoolSortOptions } from '../types';

type QueryStatus = 'idle' | 'fetching' | 'paginating';

type UseQueryStakePoolsResult = {
  status: QueryStatus;
  paginatePools: (range: ListRange) => Promise<void>;
  pools: (StakePoolDetails | undefined)[];
  searchQuery: string;
  setSearchQuery: (searchString: string) => void;
  setSort: (sortOptions: StakePoolSortOptions) => void;
  sort: StakePoolSortOptions;
  totalPoolsCount: number;
};

export const useQueryStakePools = () => {
  const portfolioMutators = useDelegationPortfolioStore((s) => s.mutators);
  const {
    walletStoreStakePoolSearchResults: { pageResults, totalResultCount: totalPoolsCount },
    walletStoreStakePoolSearchResultsStatus,
    walletStoreFetchStakePools: fetchStakePools,
    analytics,
  } = useOutsideHandles();

  const { searchQuery, sortField, sortOrder } = useDelegationPortfolioStore((store) => ({
    searchQuery: store.searchQuery || '',
    sortField: store.sortField ?? DEFAULT_SORT_OPTIONS.field,
    sortOrder: store.sortOrder ?? DEFAULT_SORT_OPTIONS.order,
  }));
  const previousRequest = useRef<{ searchQuery: string; sortField: string; sortOrder: string } | null>(null);
  const status = useMemo(() => {
    const nextRequest = { searchQuery, sortField, sortOrder };
    const requestChanged = !isEqual(previousRequest.current, nextRequest);
    const statusIdle =
      walletStoreStakePoolSearchResultsStatus === StateStatus.LOADED ||
      walletStoreStakePoolSearchResultsStatus === StateStatus.IDLE;

    return statusIdle ? 'idle' : requestChanged ? 'fetching' : 'paginating';
  }, [searchQuery, sortField, sortOrder, walletStoreStakePoolSearchResultsStatus]);

  const debouncedSearch = useMemo(
    () =>
      debounce(async (params: Required<Parameters<typeof fetchStakePools>[0]>) => {
        await fetchStakePools(params);
        previousRequest.current = {
          searchQuery: params.searchString,
          sortField: params.sort.field,
          sortOrder: params.sort.order,
        };
      }, SEARCH_DEBOUNCE_IN_MS),
    [fetchStakePools]
  );

  const paginatePools = useCallback(
    async ({ startIndex, endIndex }: { startIndex: number; endIndex: number }) => {
      if (startIndex === endIndex) return;

      debouncedSearch({
        limit: endIndex,
        searchString: searchQuery ?? '',
        skip: startIndex,
        sort: { field: sortField, order: sortOrder },
      });
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

  return useMemo<UseQueryStakePoolsResult>(
    () => ({
      paginatePools,
      pools,
      searchQuery,
      setSearchQuery,
      setSort,
      sort: {
        field: sortField,
        order: sortOrder,
      },
      status,
      totalPoolsCount,
    }),
    [paginatePools, pools, searchQuery, setSearchQuery, setSort, sortField, sortOrder, status, totalPoolsCount]
  );
};
