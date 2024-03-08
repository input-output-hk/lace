import { Search } from '@lace/common';
import { Box } from '@lace/ui';
import { USE_MULTI_DELEGATION_STAKING_GRID_VIEW } from 'featureFlags';
import { SortDirection, SortField } from 'features/BrowsePools';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StakePoolDetails, mapStakePoolToDisplayData, useDelegationPortfolioStore } from '../store';
import * as styles from './BrowsePools.css';
import { BrowsePoolsHeader } from './BrowsePoolsHeader';
import { useBrowsePoolsView, useQueryStakePools } from './hooks';
import { PortfolioBar } from './PortfolioBar';
import { StakePoolsGrid } from './StakePoolsGrid/StakePoolsGrid';
import { StakePoolsList, StakePoolsListEmpty } from './StakePoolsList';
import { BrowsePoolsView } from './types';

const LACE_APP_ID = 'lace-app';

export const BrowsePools = () => {
  const { totalPoolsCount, status, searchQuery, setSearchQuery, setSort, sort, pools, paginatePools } =
    useQueryStakePools();
  const { poolsView, switchPoolsView } = useBrowsePoolsView();

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
      <Box className={styles.browsePools} data-testid="stake-pool-table">
        <BrowsePoolsHeader poolsCount={totalPoolsCount} poolsView={poolsView} setPoolsView={switchPoolsView} />
        <Search
          className={styles.searchBar}
          withSearchIcon
          inputPlaceholder={t('browsePools.stakePoolTableBrowser.searchInputPlaceholder')}
          onChange={setSearchQuery}
          value={searchQuery}
          defaultValue={searchQuery}
          data-testid="search-input"
          loading={status === 'fetching'}
        />
        <Box mt="$16" mb="$112">
          {USE_MULTI_DELEGATION_STAKING_GRID_VIEW && poolsView === BrowsePoolsView.grid ? (
            <StakePoolsGrid
              emptyPlaceholder={status !== 'fetching' && totalPoolsCount === 0 && <StakePoolsListEmpty />}
              selectedPools={selectedList}
              pools={pools}
              loadMoreData={paginatePools}
              scrollableTargetId={LACE_APP_ID}
              sortField={sort.field}
            />
          ) : (
            <StakePoolsList
              emptyPlaceholder={status !== 'fetching' && totalPoolsCount === 0 && <StakePoolsListEmpty />}
              selectedPools={selectedList}
              pools={pools}
              loadMoreData={paginatePools}
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
