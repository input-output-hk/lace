import { PostHogAction, Search } from '@lace/common';
import { Box, Flex } from '@lace/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StateStatus, useOutsideHandles } from '../outside-handles-provider';
import { BrowsePoolsHeader } from './BrowsePoolsHeader';
import { PortfolioBar } from './PortfolioBar';
import { StakePoolsGrid } from './StakePoolsGrid';
import { StakePoolsTable } from './StakePoolsTable';
import { StakePoolSortOptions } from './StakePoolsTable/StakePoolTableBrowser';
import { BrowsePoolsView } from './types';

const LACE_APP_ID = 'lace-app';
const DEFAULT_SORT_OPTIONS: StakePoolSortOptions = {
  field: 'apy',
  order: 'desc',
};

export const BrowsePools = () => {
  const { t } = useTranslation();
  const {
    analytics,
    walletStoreStakePoolSearchResultsStatus,
    walletStoreStakePoolSearchResults: { totalResultCount },
  } = useOutsideHandles();
  const fetchingPools = walletStoreStakePoolSearchResultsStatus === StateStatus.LOADING;
  const [poolsView, setPoolsView] = useState<BrowsePoolsView>(BrowsePoolsView.grid);
  const [searchValue, setSearchValue] = useState<string>('');
  // const [isSearching, setIsSearching] = useState<boolean>(true);
  const [sort, setSort] = useState<StakePoolSortOptions>(DEFAULT_SORT_OPTIONS);
  const onSearch = (searchString: string) => {
    // setIsSearching(true);
    const startedTyping = searchValue === '' && searchString !== '';
    if (startedTyping) {
      analytics.sendEventToPostHog(PostHogAction.StakingBrowsePoolsSearchClick);
    }
    setSearchValue(searchString);
  };

  // useEffect(() => {
  //   // Check query parameters to see if it's making a new search
  //   const queryMatches = searchQuery === searchValue;
  //   const filterMatch = searchFilters?.field === sort?.field && searchFilters?.order === sort?.order;
  //   setIsSearching(!queryMatches || !filterMatch);
  // }, [searchQuery, searchFilters, searchValue, sort]);

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
      {poolsView === BrowsePoolsView.grid && <StakePoolsGrid />}
      {poolsView === BrowsePoolsView.table && (
        <Box mt="$16">
          <StakePoolsTable
            data-testid="stake-pool-table"
            scrollableTargetId={LACE_APP_ID}
            sort={sort}
            setSort={setSort}
            searchValue={searchValue}
          />
        </Box>
      )}
      <PortfolioBar />
    </Flex>
  );
};
