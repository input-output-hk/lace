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
    delegationPreferencePersistence,
    setDelegationPreferencePersistence,
  } = useOutsideHandles();

  const componentRef = useRef<HTMLDivElement | null>(null);
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = useState<string>(delegationPreferencePersistence?.searchQuery || '');
  const [sort, setSort] = useState<StakePoolSortOptions>(
    delegationPreferencePersistence?.sortOptions || DEFAULT_SORT_OPTIONS
  );
  const [poolsView, setPoolsView] = useState<BrowsePoolsView>(
    USE_MULTI_DELEGATION_STAKING_GRID_VIEW
      ? delegationPreferencePersistence?.poolsView || BrowsePoolsView.grid
      : BrowsePoolsView.table
  );
  const { selectedPortfolioStakePools } = useDelegationPortfolioStore((store) => ({
    portfolioMutators: store.mutators,
    selectedPortfolioStakePools: store.selectedPortfolio.map(({ stakePool }) => stakePool),
  }));

  const fetchingPools = walletStoreStakePoolSearchResultsStatus === StateStatus.LOADING;

  const tableHeaderTranslations = {
    apy: t('browsePools.stakePoolTableBrowser.tableHeader.ros.title'),
    blocks: t('browsePools.stakePoolTableBrowser.tableHeader.blocks.title'),
    cost: t('browsePools.stakePoolTableBrowser.tableHeader.cost'),
    liveStake: t('browsePools.stakePoolTableBrowser.tableHeader.liveStake.title'),
    margin: t('browsePools.stakePoolTableBrowser.tableHeader.margin.title'),
    pledge: t('browsePools.stakePoolTableBrowser.tableHeader.pledge.title'),
    saturation: t('browsePools.stakePoolTableBrowser.tableHeader.saturation.title'),
    ticker: t('browsePools.stakePoolTableBrowser.tableHeader.ticker'),
  };

  const debouncedSearch = useMemo(() => debounce(fetchStakePools, SEARCH_DEBOUNCE), [fetchStakePools]);

  useEffect(() => {
    setDelegationPreferencePersistence({
      ...delegationPreferencePersistence,
      poolsView,
      searchQuery: searchValue,
      selectedPoolsIds: selectedPortfolioStakePools.map(({ id }) => id),
      sortOptions: sort,
    });
  }, [
    delegationPreferencePersistence,
    poolsView,
    searchValue,
    selectedPortfolioStakePools,
    setDelegationPreferencePersistence,
    sort,
  ]);

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

  const selectedList = useMemo(
    () => selectedPortfolioStakePools.map((pool) => mapStakePoolToDisplayData({ stakePool: pool })),
    [selectedPortfolioStakePools]
  );

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
