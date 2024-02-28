import { Wallet } from '@lace/cardano';
import { Search } from '@lace/common';
import { Box } from '@lace/ui';
import { USE_MULTI_DELEGATION_STAKING_GRID_VIEW } from 'featureFlags';
import { SortDirection, SortField } from 'features/BrowsePools/types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../outside-handles-provider';
import { mapStakePoolToDisplayData, useDelegationPortfolioStore } from '../store';
import * as styles from './BrowsePools.css';
import { BrowsePoolsHeader } from './BrowsePoolsHeader';
import { useBrowsePools, useRestorePoolsSelection } from './hooks';
import { PortfolioBar } from './PortfolioBar';
import { StakePoolsGrid } from './StakePoolsGrid/StakePoolsGrid';
import { StakePoolsList, StakePoolsListEmpty } from './StakePoolsList';
import { BrowsePoolsView } from './types';

const LACE_APP_ID = 'lace-app';

export const BrowsePools = () => {
  const { stakingBrowserPreferencesPersistence, setStakingBrowserPreferencesPersistence } = useOutsideHandles();
  const { totalResultCount, fetchingPools, searchValue, onSearch, setSort, sort, list, loadMoreData } =
    useBrowsePools();

  const { t } = useTranslation();
  const [poolsView, setPoolsView] = useState<BrowsePoolsView>(
    USE_MULTI_DELEGATION_STAKING_GRID_VIEW
      ? stakingBrowserPreferencesPersistence?.poolsView || BrowsePoolsView.grid
      : BrowsePoolsView.table
  );
  const { selectedPortfolioStakePools } = useDelegationPortfolioStore((store) => ({
    selectedPortfolioStakePools: store.selectedPortfolio.map(({ stakePool }) => stakePool),
  }));

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
      <Box className={styles.stakePoolsTable} data-testid="stake-pool-table">
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
