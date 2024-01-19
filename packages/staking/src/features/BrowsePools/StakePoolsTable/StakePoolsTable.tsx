import { PostHogAction, Search, getRandomIcon } from '@lace/common';
import { Box } from '@lace/ui';
import debounce from 'lodash/debounce';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StateStatus, useOutsideHandles } from '../../outside-handles-provider';
import { mapStakePoolToDisplayData, useDelegationPortfolioStore } from '../../store';
import * as styles from './StakePoolsTable.css';
import { StakePoolsTableEmpty } from './StakePoolsTableEmpty/StakePoolsTableEmpty';
import { StakePoolTableBrowser, StakePoolTableBrowserProps } from './StakePoolTableBrowser/StakePoolTableBrowser';
import { SortDirection, SortField, StakePoolSortOptions } from './types';

type StakePoolsTableProps = {
  scrollableTargetId: string;
};

const DEFAULT_SORT_OPTIONS: StakePoolSortOptions = {
  field: SortField.name,
  order: SortDirection.desc,
};

const searchDebounce = 300;

export const StakePoolsTable = ({ scrollableTargetId }: StakePoolsTableProps) => {
  const isMounted = useRef(false);
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = useState<string>('');
  const [sort, setSort] = useState<StakePoolSortOptions>(DEFAULT_SORT_OPTIONS);
  const selectedPortfolioStakePools = useDelegationPortfolioStore((store) =>
    store.selectedPortfolio.map(({ stakePool }) => stakePool)
  );
  const {
    currentChain,
    walletStoreStakePoolSearchResults: { pageResults, totalResultCount },
    walletStoreStakePoolSearchResultsStatus,
    walletStoreResetStakePools: resetStakePools,
    walletStoreFetchStakePools: fetchStakePools,
    analytics,
  } = useOutsideHandles();

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

  const debouncedSearch = useMemo(() => debounce(fetchStakePools, searchDebounce), [fetchStakePools]);
  const debouncedResetStakePools = useMemo(
    () => resetStakePools && debounce(resetStakePools, searchDebounce),
    [resetStakePools]
  );

  useEffect(() => {
    if (isMounted?.current) {
      // reset pools on network switching, searchValue change and sort change
      debouncedResetStakePools?.();
    }
  }, [currentChain, searchValue, sort, debouncedSearch, debouncedResetStakePools]);

  useEffect(() => {
    isMounted.current = true;
  }, []);

  const loadMoreData = useCallback(
    ({ startIndex, endIndex }: Parameters<StakePoolTableBrowserProps['loadMoreData']>[0]) => {
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
    () =>
      pageResults.map((pool) => {
        const stakePool = pool && mapStakePoolToDisplayData({ stakePool: pool });
        const logo = pool && getRandomIcon({ id: pool.id.toString(), size: 30 });

        return pool
          ? {
              ...stakePool,
              hexId: pool.hexId,
              liveStake: `${stakePool.liveStake.number}${stakePool.liveStake.unit}`,
              logo: stakePool.logo || logo,
              stakePool: pool,
            }
          : undefined;
      }) || [],
    [pageResults]
  );

  const selectedList = useMemo(
    () =>
      selectedPortfolioStakePools.map((pool) => {
        const stakePool = pool && mapStakePoolToDisplayData({ stakePool: pool });
        const logo = pool && getRandomIcon({ id: pool.id.toString(), size: 30 });

        return {
          ...stakePool,
          hexId: pool.hexId,
          liveStake: `${stakePool.liveStake.number}${stakePool.liveStake.unit}`,
          logo: stakePool.logo || logo,
          stakePool: pool,
        };
      }) || [],
    [selectedPortfolioStakePools]
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
      <Box mt="$10">
        <StakePoolTableBrowser
          emptyPlaceholder={!fetchingPools && totalResultCount === 0 && <StakePoolsTableEmpty />}
          selectedPools={selectedList}
          pools={list}
          loadMoreData={loadMoreData}
          scrollableTargetId={scrollableTargetId}
          translations={tableHeaderTranslations}
          activeSort={sort}
          setActiveSort={setSort}
        />
      </Box>
    </Box>
  );
};
