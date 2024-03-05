import { Search } from '@lace/common';
import { Box } from '@lace/ui';
import { USE_MULTI_DELEGATION_STAKING_GRID_VIEW } from 'featureFlags';
import { SortDirection, SortField } from 'features/BrowsePools';
import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../outside-handles-provider';
import { StakePoolDetails, mapStakePoolToDisplayData, useDelegationPortfolioStore } from '../store';
import * as styles from './BrowsePools.css';
import { BrowsePoolsHeader } from './BrowsePoolsHeader';
import { useBrowsePools, useRestorePoolsSelection } from './hooks';
import { PortfolioBar } from './PortfolioBar';
import { StakePoolsGrid } from './StakePoolsGrid/StakePoolsGrid';
import { StakePoolsList, StakePoolsListEmpty } from './StakePoolsList';
import { BrowsePoolsView } from './types';

const LACE_APP_ID = 'lace-app';

export const BrowsePools = () => {
  const { setStakingBrowserPreferencesPersistence, stakingBrowserPreferencesPersistence } = useOutsideHandles();
  const {
    totalResultCount,
    fetchingPools,
    searchValue,
    onSearch,
    setSort,
    sort,
    list,
    loadMoreData,
    switchPoolsView,
    poolsView,
  } = useBrowsePools();

  const { t } = useTranslation();
  const { selectedPortfolioStakePools } = useDelegationPortfolioStore((store) => ({
    selectedPortfolioStakePools: store.selectedPortfolio.map(({ stakePool }) => stakePool),
  }));

  const tableHeaderTranslations: Record<SortField, string> = {
    blocks: t('browsePools.stakePoolTableBrowser.tableHeader.blocks.title'),
    cost: t('browsePools.stakePoolTableBrowser.tableHeader.cost.title'),
    liveStake: t('browsePools.stakePoolTableBrowser.tableHeader.liveStake.title'),
    margin: t('browsePools.stakePoolTableBrowser.tableHeader.margin.title'),
    pledge: t('browsePools.stakePoolTableBrowser.tableHeader.pledge.title'),
    ros: t('browsePools.stakePoolTableBrowser.tableHeader.ros.title'),
    saturation: t('browsePools.stakePoolTableBrowser.tableHeader.saturation.title'),
    ticker: t('browsePools.stakePoolTableBrowser.tableHeader.ticker.title'),
  };

  useEffect(
    () =>
      setStakingBrowserPreferencesPersistence({
        ...stakingBrowserPreferencesPersistence,
        selectedPoolsIds: selectedPortfolioStakePools.map(({ id }) => id),
      }),
    [
      stakingBrowserPreferencesPersistence,
      poolsView,
      searchValue,
      selectedPortfolioStakePools,
      sort,
      setStakingBrowserPreferencesPersistence,
    ]
  );

  // TODO consider moving to a single hydration/Setup step
  useRestorePoolsSelection();

  const sortSelectedPools = useCallback(
    (pool1: StakePoolDetails, pool2: StakePoolDetails) => {
      switch (sort.field) {
        case 'ticker':
          return (pool1.ticker || '-')?.localeCompare(pool2.ticker || '-');
        case 'saturation':
        case 'ros':
          return Number(pool1[sort.field]) - Number(pool2[sort.field]);
        case 'cost':
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
        <BrowsePoolsHeader poolsCount={totalResultCount} poolsView={poolsView} setPoolsView={switchPoolsView} />
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
