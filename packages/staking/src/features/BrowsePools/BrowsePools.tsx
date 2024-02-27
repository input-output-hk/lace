import { Wallet } from '@lace/cardano';
import { PostHogAction, Search } from '@lace/common';
import { Box } from '@lace/ui';
import { USE_MULTI_DELEGATION_STAKING_GRID_VIEW } from 'featureFlags';
import { SortDirection, SortField, StakePoolSortOptions } from 'features/BrowsePools/types';
import debounce from 'lodash/debounce';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StateStatus, useOutsideHandles } from '../outside-handles-provider';
import { mapStakePoolToDisplayData, useDelegationPortfolioStore } from '../store';
import * as styles from './BrowsePools.css';
import { BrowsePoolsHeader } from './BrowsePoolsHeader';
import { useRestorePoolsSelection } from './hooks';
import { PortfolioBar } from './PortfolioBar';
import { StakePoolsGrid } from './StakePoolsGrid/StakePoolsGrid';
import { StakePoolsList, StakePoolsListEmpty, StakePoolsListProps } from './StakePoolsList';
import { BrowsePoolsView } from './types';

const DEFAULT_SORT_OPTIONS: StakePoolSortOptions = {
  field: SortField.name,
  order: SortDirection.desc,
};

const LACE_APP_ID = 'lace-app';
const SEARCH_DEBOUNCE = 300;

export const BrowsePools = () => {
  const {
    currentChain,
    walletStoreStakePoolSearchResults: { pageResults, totalResultCount },
    walletStoreStakePoolSearchResultsStatus,
    walletStoreResetStakePools: resetStakePools,
    walletStoreFetchStakePools: fetchStakePools,
    analytics,
    stakingBrowserPreferencesPersistence,
    setStakingBrowserPreferencesPersistence,
  } = useOutsideHandles();

  const componentRef = useRef<HTMLDivElement | null>(null);
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = useState<string>(stakingBrowserPreferencesPersistence?.searchQuery || '');
  const [sort, setSort] = useState<StakePoolSortOptions>(
    stakingBrowserPreferencesPersistence?.sortOptions || DEFAULT_SORT_OPTIONS
  );
  const [poolsView, setPoolsView] = useState<BrowsePoolsView>(
    USE_MULTI_DELEGATION_STAKING_GRID_VIEW
      ? stakingBrowserPreferencesPersistence?.poolsView || BrowsePoolsView.grid
      : BrowsePoolsView.table
  );
  const { selectedPortfolioStakePools } = useDelegationPortfolioStore((store) => ({
    selectedPortfolioStakePools: store.selectedPortfolio.map(({ stakePool }) => stakePool),
  }));

  const fetchingPools = walletStoreStakePoolSearchResultsStatus === StateStatus.LOADING;

  const tableHeaderTranslations = {
    apy: t('browsePools.stakePoolTableBrowser.tableHeader.apy.title'),
    blocks: t('browsePools.stakePoolTableBrowser.tableHeader.blocks.title'),
    cost: t('browsePools.stakePoolTableBrowser.tableHeader.cost.title'),
    liveStake: t('browsePools.stakePoolTableBrowser.tableHeader.liveStake.title'),
    margin: t('browsePools.stakePoolTableBrowser.tableHeader.margin.title'),
    pledge: t('browsePools.stakePoolTableBrowser.tableHeader.pledge.title'),
    saturation: t('browsePools.stakePoolTableBrowser.tableHeader.saturation.title'),
    ticker: t('browsePools.stakePoolTableBrowser.tableHeader.ticker.title'),
  };

  const debouncedSearch = useMemo(() => debounce(fetchStakePools, SEARCH_DEBOUNCE), [fetchStakePools]);

  useEffect(
    () => () =>
      setStakingBrowserPreferencesPersistence({
        ...stakingBrowserPreferencesPersistence,
        poolsView,
        searchQuery: searchValue,
        selectedPoolsIds: selectedPortfolioStakePools.map(({ id }) => id),
        sortOptions: sort,
      }),
    [
      stakingBrowserPreferencesPersistence,
      poolsView,
      searchValue,
      selectedPortfolioStakePools,
      setStakingBrowserPreferencesPersistence,
      sort,
    ]
  );

  useRestorePoolsSelection();

  useEffect(() => {
    if (componentRef?.current) {
      // reset pools on network switching, searchValue change and sort change
      resetStakePools?.();
    }
  }, [currentChain, searchValue, sort, resetStakePools]);

  const loadMoreData = useCallback(
    ({ startIndex, endIndex }: Parameters<StakePoolsListProps['loadMoreData']>[0]) => {
      if (startIndex !== endIndex) {
        debouncedSearch({ limit: endIndex, searchString: searchValue, skip: startIndex, sort });
      }
    },
    [debouncedSearch, searchValue, sort]
  );

  const onSearch = (searchString: string) => {
    const startedTyping = searchValue === '' && searchString !== '';
    if (startedTyping) {
      analytics.sendEventToPostHog(PostHogAction.StakingBrowsePoolsSearchClick);
    }
    setSearchValue(searchString);
  };

  const list = useMemo(
    () => pageResults.map((pool) => (pool ? mapStakePoolToDisplayData({ stakePool: pool }) : undefined)),
    [pageResults]
  );

  const sortSelectedPools = useCallback(
    (pool1: Wallet.util.StakePool, pool2: Wallet.util.StakePool) => {
      switch (sort.field) {
        case SortField.name:
          return (pool1.name || '-')?.localeCompare(pool2.name || '-');
        case SortField.saturation:
        case SortField.apy:
          return Number(pool1[sort.field]) - Number(pool2[sort.field]);
        case SortField.cost:
          return (pool1.cost.number || '-')?.localeCompare(pool2.cost.number || '-');
        default:
          return 0;
      }
    },
    [sort.field]
  );

  const selectedList = useMemo(() => {
    const result = selectedPortfolioStakePools
      .map((pool) => mapStakePoolToDisplayData({ stakePool: pool }))
      .sort(sortSelectedPools);
    return sort.order === SortDirection.desc ? result.reverse() : result;
  }, [selectedPortfolioStakePools, sort.order, sortSelectedPools]);

  return (
    <>
      <Box ref={componentRef} className={styles.stakePoolsTable} data-testid="stake-pool-table">
        <BrowsePoolsHeader poolsCount={totalResultCount} poolsView={poolsView} setPoolsView={setPoolsView} />
        <Search
          className={styles.searchBar}
          withSearchIcon
          inputPlaceholder={t('browsePools.stakePoolTableBrowser.searchInputPlaceholder')}
          onChange={onSearch}
          value={searchValue}
          defaultValue={searchValue}
          data-testid="search-input"
          loading={fetchingPools}
        />
        <Box mt="$16" mb="$112">
          {USE_MULTI_DELEGATION_STAKING_GRID_VIEW && poolsView === BrowsePoolsView.grid ? (
            <StakePoolsGrid
              emptyPlaceholder={!fetchingPools && totalResultCount === 0 && <StakePoolsListEmpty />}
              selectedPools={selectedList}
              pools={list}
              loadMoreData={loadMoreData}
              scrollableTargetId={LACE_APP_ID}
              sortField={sort.field}
            />
          ) : (
            <StakePoolsList
              emptyPlaceholder={!fetchingPools && totalResultCount === 0 && <StakePoolsListEmpty />}
              selectedPools={selectedList}
              pools={list}
              loadMoreData={loadMoreData}
              scrollableTargetId={LACE_APP_ID}
              translations={tableHeaderTranslations}
              activeSort={sort}
              setActiveSort={setSort}
            />
          )}
        </Box>
      </Box>
      <PortfolioBar />
    </>
  );
};
