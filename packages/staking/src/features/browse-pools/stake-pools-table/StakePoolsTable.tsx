import { StakePoolItemBrowserProps, Wallet } from '@lace/cardano';
import { Search, getRandomIcon } from '@lace/common';
import { Box, Flex } from '@lace/ui';
import debounce from 'lodash/debounce';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StateStatus, useOutsideHandles } from '../../outside-handles-provider';
import { useDelegationPortfolioStore, useStakePoolDetails } from '../../store';
import styles from './StakePoolsTable.module.scss';
import { StakePoolsTableEmpty } from './StakePoolsTableEmpty';
import { StakePoolSortOptions, StakePoolTableBrowser } from './StakePoolTableBrowser';

type StakePoolsTableProps = {
  onStake: (id: StakePoolItemBrowserProps['id']) => void;
  scrollableTargetId: string;
};

const DEFAULT_SORT_OPTIONS: StakePoolSortOptions = {
  field: 'apy',
  order: 'desc',
};

const searchDebounce = 300;
const defaultFetchLimit = 10;

export const StakePoolsTable = ({ onStake, scrollableTargetId }: StakePoolsTableProps) => {
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(true);
  const [isLoadingList, setIsLoadingList] = useState<boolean>(true);
  const [sort, setSort] = useState<StakePoolSortOptions>(DEFAULT_SORT_OPTIONS);
  const [stakePools, setStakePools] = useState<Wallet.StakePoolSearchResults['pageResults']>([]);
  const [skip, setSkip] = useState<number>(0);
  const { addPoolToDraft, removePoolFromDraft } = useDelegationPortfolioStore((state) => state.mutators);

  const { setIsDrawerVisible } = useStakePoolDetails();

  const {
    walletStoreWalletUICardanoCoin: cardanoCoin,
    walletStoreBlockchainProvider: blockchainProvider,
    delegationStoreSetSelectedStakePool: setSelectedStakePool,
    walletStoreStakePoolSearchResults: {
      pageResults,
      totalResultCount,
      skip: searchSkip = 0,
      searchQuery,
      searchFilters,
    },
    walletStoreStakePoolSearchResultsStatus,
    walletStoreFetchStakePools: fetchStakePools,
  } = useOutsideHandles();

  const fetchingPools = walletStoreStakePoolSearchResultsStatus === StateStatus.LOADING;

  const tableHeaderTranslations = {
    apy: t('browsePools.stakePoolTableBrowser.tableHeader.ros'),
    cost: t('browsePools.stakePoolTableBrowser.tableHeader.cost'),
    poolName: t('browsePools.stakePoolTableBrowser.tableHeader.poolName'),
    saturation: t('browsePools.stakePoolTableBrowser.tableHeader.saturation'),
  };

  const debouncedSearch = useMemo(() => debounce(fetchStakePools, searchDebounce), [fetchStakePools]);

  useEffect(() => {
    // Close pool details drawer & fetch pools on mount, network switching, searchValue change and sort change
    setIsLoadingList(true);
    setIsDrawerVisible(false);
    debouncedSearch({ searchString: searchValue, sort });
  }, [blockchainProvider, searchValue, sort, debouncedSearch, setIsDrawerVisible]);

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
    setSearchValue(searchString);
  };

  const list = useMemo(
    () =>
      stakePools?.map((pool: Wallet.Cardano.StakePool) => {
        const stakePool = Wallet.util.stakePoolTransformer({ cardanoCoin, stakePool: pool });
        const logo = getRandomIcon({ id: pool.id.toString(), size: 30 });
        const hexId = Wallet.Cardano.PoolIdHex(stakePool.hexId);

        return {
          logo,
          ...stakePool,
          addToDraft: () =>
            addPoolToDraft({
              displayData: stakePool,
              id: hexId,
              name: stakePool.name,
              ticker: stakePool.ticker,
              weight: 1,
            }),
          hexId,
          onClick: (): void => {
            setSelectedStakePool({ logo, ...pool });
            setIsDrawerVisible(true);
          },
          onStake: (e: React.MouseEvent<HTMLDivElement, MouseEvent>, poolId: string) => {
            e.stopPropagation();
            setSelectedStakePool(pool);
            onStake(poolId);
          },
          removeFromDraft: () => removePoolFromDraft({ id: hexId }),
        };
      }) || [],
    [stakePools, cardanoCoin, setSelectedStakePool, setIsDrawerVisible, onStake, removePoolFromDraft, addPoolToDraft]
  );

  return (
    <Flex flexDirection={'column'} alignItems={'stretch'} data-testid="stake-pool-table">
      <Search
        className={styles.search}
        withSearchIcon
        inputPlaceholder={t('browsePools.stakePoolTableBrowser.searchInputPlaceholder')}
        onChange={onSearch}
        data-testid="search-input"
        loading={fetchingPools}
      />
      <Box mt={'$32'}>
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
    </Flex>
  );
};
