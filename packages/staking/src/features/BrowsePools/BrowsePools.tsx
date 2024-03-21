import { Search } from '@lace/common';
import { Box } from '@lace/ui';
import { USE_MULTI_DELEGATION_STAKING_GRID_VIEW } from 'featureFlags';
import { useTranslation } from 'react-i18next';
import { useDelegationPortfolioStore } from '../store';
import * as styles from './BrowsePools.css';
import { BrowsePoolsHeader } from './BrowsePoolsHeader';
import { useBrowsePoolsView, useQueryStakePools } from './hooks';
import { PortfolioBar } from './PortfolioBar';
import { StakePoolsGrid } from './StakePoolsGrid/StakePoolsGrid';
import { StakePoolsList } from './StakePoolsList';
import { StakePoolsSearchEmpty } from './StakePoolsSearchEmpty';
import { BrowsePoolsView } from './types';

const LACE_APP_ID = 'lace-app';

export const BrowsePools = () => {
  const { totalPoolsCount, status, searchQuery, setSearchQuery, setSort, sort, pools, paginatePools } =
    useQueryStakePools();
  const { poolsView, switchPoolsView } = useBrowsePoolsView();

  const { t } = useTranslation();
  const { selectedPools } = useDelegationPortfolioStore((store) => ({
    selectedPools: store.selectedPortfolio.map(({ displayData }) => displayData),
  }));

  const fetching = status === 'fetching';

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
          loading={fetching}
        />
        <Box mt="$16" mb="$112">
          {USE_MULTI_DELEGATION_STAKING_GRID_VIEW && poolsView === BrowsePoolsView.grid ? (
            <StakePoolsGrid
              emptyPlaceholder={StakePoolsSearchEmpty}
              selectedPools={selectedPools}
              pools={pools}
              showSkeleton={fetching}
              loadMoreData={paginatePools}
              scrollableTargetId={LACE_APP_ID}
              sortField={sort.field}
            />
          ) : (
            <StakePoolsList
              emptyPlaceholder={StakePoolsSearchEmpty}
              selectedPools={selectedPools}
              pools={pools}
              showSkeleton={fetching}
              loadMoreData={paginatePools}
              scrollableTargetId={LACE_APP_ID}
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
