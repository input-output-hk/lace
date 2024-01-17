import { Wallet } from '@lace/cardano';
import { PostHogAction, Search, getRandomIcon } from '@lace/common';
import { Box, Flex } from '@lace/ui';
import debounce from 'lodash/debounce';
import uniqBy from 'lodash/uniqBy';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StateStatus, useOutsideHandles } from '../outside-handles-provider';
import { useDelegationPortfolioStore } from '../store';
import { BrowsePoolsHeader } from './BrowsePoolsHeader';
import { PortfolioBar } from './PortfolioBar';
import { StakePoolsGrid } from './StakePoolsGrid';
import { StakePoolsTable } from './StakePoolsTable';
import { SortDirection, SortField, StakePoolSortOptions } from './StakePoolsTable/types';
import { BrowsePoolsView } from './types';
// TODO move types

const LACE_APP_ID = 'lace-app';
const DEFAULT_SORT_OPTIONS: StakePoolSortOptions = {
  field: SortField.apy,
  order: SortDirection.desc,
};

const searchDebounce = 300;
const defaultFetchLimit = 100;

export const BrowsePools = () => {
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(true);
  const [isLoadingList, setIsLoadingList] = useState<boolean>(true);
  const [sort, setSort] = useState<StakePoolSortOptions>(DEFAULT_SORT_OPTIONS);
  const [stakePools, setStakePools] = useState<Wallet.StakePoolSearchResults['pageResults']>([]);
  const [skip, setSkip] = useState<number>(0);
  const selectedPortfolioStakePools = useDelegationPortfolioStore((store) =>
    store.selectedPortfolio.map(({ stakePool }) => stakePool)
  );
  const {
    walletStoreWalletUICardanoCoin: cardanoCoin,
    currentChain,
    walletStoreStakePoolSearchResults: {
      pageResults,
      totalResultCount,
      skip: searchSkip = 0,
      searchQuery,
      searchFilters,
    },
    walletStoreStakePoolSearchResultsStatus,
    walletStoreFetchStakePools: fetchStakePools,
    analytics,
  } = useOutsideHandles();
  const fetchingPools = walletStoreStakePoolSearchResultsStatus === StateStatus.LOADING;
  const [poolsView, setPoolsView] = useState<BrowsePoolsView>(BrowsePoolsView.grid);
  // TODO

  const debouncedSearch = useMemo(() => debounce(fetchStakePools, searchDebounce), [fetchStakePools]);

  useEffect(() => {
    // Fetch pools on mount, network switching, searchValue change and sort change
    setIsLoadingList(true);
    debouncedSearch({ searchString: searchValue, sort });
  }, [currentChain, searchValue, sort, debouncedSearch]);

  const loadMoreData = () => fetchStakePools({ searchString: searchValue, skip: skip + defaultFetchLimit, sort });

  useEffect(() => {
    // Check query parameters to see if it's making a new search
    const queryMatches = searchQuery === searchValue;
    const filterMatch = searchFilters?.field === sort?.field && searchFilters?.order === sort?.order;
    setIsSearching(!queryMatches || !filterMatch);
  }, [searchQuery, searchFilters, searchValue, sort]);

  useEffect(() => {
    // Update stake pool list and new offset position
    setStakePools((prevPools: Wallet.StakePoolSearchResults['pageResults']) =>
      searchSkip === 0 ? pageResults : [...prevPools, ...pageResults]
    );
    setSkip(searchSkip);
    setIsLoadingList(false);
  }, [pageResults, searchSkip]);

  const onSearch = (searchString: string) => {
    setIsSearching(true);
    const startedTyping = searchValue === '' && searchString !== '';
    if (startedTyping) {
      analytics.sendEventToPostHog(PostHogAction.StakingBrowsePoolsSearchClick);
    }
    setSearchValue(searchString);
  };

  // imitates apps/browser-extension-wallet/src/stores/slices/stake-pool-search-slice.ts
  const naiveSelectedPoolsSearch = (searchString: string, pools: Wallet.Cardano.StakePool[]) => {
    const lowerCaseSearchString = searchString.toLowerCase();
    return pools.filter(
      (pool) =>
        pool.metadata?.name.toLowerCase().includes(lowerCaseSearchString) ||
        pool.metadata?.ticker.toLowerCase().includes(lowerCaseSearchString) ||
        pool.id.toLowerCase() === lowerCaseSearchString
    );
  };

  const combinedUnique = useMemo(() => {
    const combinedStakePools = [
      ...(searchValue
        ? naiveSelectedPoolsSearch(searchValue, selectedPortfolioStakePools)
        : selectedPortfolioStakePools),
      ...stakePools,
    ];
    return uniqBy(combinedStakePools, (p) => p.id);
  }, [stakePools, selectedPortfolioStakePools, searchValue]);

  const list = useMemo(
    () =>
      combinedUnique.map((pool) => {
        const stakePool = Wallet.util.stakePoolTransformer({ cardanoCoin, stakePool: pool });
        const logo = getRandomIcon({ id: pool.id.toString(), size: 30 });

        return {
          logo,
          ...stakePool,
          hexId: pool.hexId,
          stakePool: pool,
        };
      }) || [],
    [combinedUnique, cardanoCoin]
  );
  const total = isSearching ? 0 : totalResultCount;

  return (
    <Flex flexDirection="column" alignItems="stretch">
      <BrowsePoolsHeader poolsCount={totalResultCount} poolsView={poolsView} setPoolsView={setPoolsView} />
      <Search
        withSearchIcon
        inputPlaceholder={t('browsePools.stakePoolTableBrowser.searchInputPlaceholder')}
        onChange={onSearch}
        data-testid="search-input"
        loading={fetchingPools}
      />
      <Box mt="$16">
        {poolsView === BrowsePoolsView.grid && (
          <StakePoolsGrid
            scrollableTargetId={LACE_APP_ID}
            sortField={sort.field}
            list={list}
            loadMoreData={loadMoreData}
            totalResultCount={total}
            loading={isLoadingList || isSearching}
          />
        )}
        {poolsView === BrowsePoolsView.table && (
          <StakePoolsTable
            scrollableTargetId={LACE_APP_ID}
            sort={sort}
            setSort={setSort}
            list={list}
            loadMoreData={loadMoreData}
            totalResultCount={total}
            showSkeleton={isLoadingList && !isSearching}
          />
        )}
      </Box>
      <PortfolioBar />
    </Flex>
  );
};
