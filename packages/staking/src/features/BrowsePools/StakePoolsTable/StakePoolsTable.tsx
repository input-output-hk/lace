import { Wallet } from '@lace/cardano';
import { PostHogAction, Search, getRandomIcon } from '@lace/common';
import { Box } from '@lace/ui';
import debounce from 'lodash/debounce';
import uniqBy from 'lodash/uniqBy';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StateStatus, useOutsideHandles } from '../../outside-handles-provider';
import { useDelegationPortfolioStore } from '../../store';
import styles from './StakePoolsTable.module.scss';
import { StakePoolsTableEmpty } from './StakePoolsTableEmpty';
import { StakePoolSortOptions, StakePoolTableBrowser } from './StakePoolTableBrowser';

type StakePoolsTableProps = {
  scrollableTargetId: string;
};

const DEFAULT_SORT_OPTIONS: StakePoolSortOptions = {
  field: 'apy',
  order: 'desc',
};

const searchDebounce = 300;
const defaultFetchLimit = 10;

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

export const StakePoolsTable = ({ scrollableTargetId }: StakePoolsTableProps) => {
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(true);
  const [isLoadingList, setIsLoadingList] = useState<boolean>(true);
  const [sort, setSort] = useState<StakePoolSortOptions>(DEFAULT_SORT_OPTIONS);
  const [stakePools, setStakePools] = useState<Wallet.StakePoolSearchResults['pageResults']>([]);
  const [skip, setSkip] = useState<number>(0);
  const selectedPortfolio = useDelegationPortfolioStore((store) => store.selectedPortfolio);
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

  const tableHeaderTranslations = {
    apy: t('browsePools.stakePoolTableBrowser.tableHeader.ros.title'),
    cost: t('browsePools.stakePoolTableBrowser.tableHeader.cost'),
    poolName: t('browsePools.stakePoolTableBrowser.tableHeader.poolName'),
    saturation: t('browsePools.stakePoolTableBrowser.tableHeader.saturation.title'),
  };

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
    setStakePools((prevPools: Wallet.StakePoolSearchResults['pageResults']) => {
      const selectedPortfolioStakePools = selectedPortfolio.map((sp) => sp.stakePool);
      const combinedStakePools = [
        ...(searchValue
          ? naiveSelectedPoolsSearch(searchValue, selectedPortfolioStakePools)
          : selectedPortfolioStakePools),
        ...(searchSkip === 0 ? pageResults : [...prevPools, ...pageResults]),
      ];
      return uniqBy(combinedStakePools, (p) => p.id);
    });
    setSkip(searchSkip);
    setIsLoadingList(false);
  }, [pageResults, searchSkip, searchValue, selectedPortfolio]);

  const onSearch = (searchString: string) => {
    setIsSearching(true);
    const startedTyping = searchValue === '' && searchString !== '';
    if (startedTyping) {
      analytics.sendEventToPostHog(PostHogAction.StakingBrowsePoolsSearchClick);
    }
    setSearchValue(searchString);
  };

  const list = useMemo(
    () =>
      stakePools.map((pool) => {
        const stakePool = Wallet.util.stakePoolTransformer({ cardanoCoin, stakePool: pool });
        const logo = getRandomIcon({ id: pool.id.toString(), size: 30 });

        return {
          logo,
          ...stakePool,
          hexId: pool.hexId,
          stakePool: pool,
        };
      }) || [],
    [stakePools, cardanoCoin]
  );

  return (
    <Box className={styles.stakePoolsTable} data-testid="stake-pool-table">
      <Search
        withSearchIcon
        inputPlaceholder={t('browsePools.stakePoolTableBrowser.searchInputPlaceholder')}
        onChange={onSearch}
        data-testid="search-input"
        loading={fetchingPools}
      />
      <Box mt="$32">
        <StakePoolTableBrowser
          items={list}
          loadMoreData={loadMoreData}
          locale={{ emptyText: true }}
          // TODO: there are too many loading states and it's confusing, we should refactor this and reduce them
          // do not show loader if we are already searching/filtering
          total={isSearching ? 0 : totalResultCount}
          emptyPlaceholder={!fetchingPools && !isSearching && <StakePoolsTableEmpty />}
          // Show skeleton if it's loading the list while a search is not being performed
          showSkeleton={isLoadingList && !isSearching}
          scrollableTargetId={scrollableTargetId}
          translations={tableHeaderTranslations}
          activeSort={sort}
          setActiveSort={setSort}
        />
      </Box>
    </Box>
  );
};
