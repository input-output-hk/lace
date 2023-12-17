import React, { useEffect, useMemo, useState } from 'react';
import debounce from 'lodash/debounce';
import { Wallet } from '@lace/cardano';
import {
  Columns,
  SortDirection,
  SortField,
  StakePoolItemBrowser,
  StakePoolSortOptions,
  StakePoolTableBodyBrowser,
  StakePoolTableHeaderBrowser,
  TranslationsFor
} from '@lace/staking';
import { Typography } from 'antd';
import { Search, getRandomIcon } from '@lace/common';
import { useTranslation } from 'react-i18next';
import { stakePoolResultsSelector } from '@stores/selectors/staking-selectors';
import { useDelegationStore } from '@src/features/delegation/stores';
import { useWalletStore } from '@stores';
import { useStakePoolDetails } from '../../store';
import { StakePoolsTableEmpty } from './StakePoolsTableEmpty';
import styles from './StakePoolsTable.modules.scss';
import { useAnalyticsContext } from '@providers';
import {
  MatomoEventActions,
  MatomoEventCategories,
  AnalyticsEventNames,
  PostHogAction
} from '@providers/AnalyticsProvider/analyticsTracker';
import { compactNumberWithUnit } from '@src/utils/format-number';

const { Text } = Typography;

type stakePoolsTableProps = {
  onStake?: (id: Parameters<typeof StakePoolItemBrowser>[0]['id']) => void;
  scrollableTargetId: string;
};

const DEFAULT_SORT_OPTIONS: StakePoolSortOptions = {
  field: Columns.apy,
  order: SortDirection.desc
};

const searchDebounce = 300;
const defaultFetchLimit = 10;

export const StakePoolsTable = ({ scrollableTargetId, onStake }: stakePoolsTableProps): React.ReactElement => {
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(true);
  const [isLoadingList, setIsLoadingList] = useState<boolean>(true);
  const [sort, setSort] = useState<StakePoolSortOptions>(DEFAULT_SORT_OPTIONS);
  const [stakePools, setStakePools] = useState<Wallet.StakePoolSearchResults['pageResults']>([]);
  const [skip, setSkip] = useState<number>(0);
  const { setSelectedStakePool } = useDelegationStore();
  const { setIsDrawerVisible } = useStakePoolDetails();
  const analytics = useAnalyticsContext();

  const {
    stakePoolSearchResults: { pageResults, totalResultCount, skip: searchSkip, searchQuery, searchFilters },
    isSearching: fetchingPools,
    fetchStakePools
  } = useWalletStore(stakePoolResultsSelector);
  const {
    walletUI: { cardanoCoin },
    blockchainProvider
  } = useWalletStore();

  const tableHeaderTranslations: TranslationsFor<Columns> = {
    ticker: t('cardano.stakePoolTableBrowser.tableHeader.ticker'),
    apy: t('cardano.stakePoolTableBrowser.tableHeader.ros'),
    cost: t('cardano.stakePoolTableBrowser.tableHeader.cost'),
    saturation: t('cardano.stakePoolTableBrowser.tableHeader.saturation'),
    margin: t('cardano.stakePoolTableBrowser.tableHeader.margin'),
    blocks: t('cardano.stakePoolTableBrowser.tableHeader.blocks'),
    pledge: t('cardano.stakePoolTableBrowser.tableHeader.pledge')
  };

  const debouncedSearch = useMemo(() => debounce(fetchStakePools, searchDebounce), [fetchStakePools]);

  useEffect(() => {
    // Close pool details drawer & fetch pools on mount, network switching, searchValue change and sort change
    setIsLoadingList(true);
    setIsDrawerVisible(false);
    debouncedSearch({ searchString: searchValue, sort });
  }, [blockchainProvider, searchValue, sort, debouncedSearch, setIsDrawerVisible]);

  const loadMoreData = () => fetchStakePools({ searchString: searchValue, sort, skip: skip + defaultFetchLimit });

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
        const stakePool = Wallet.util.stakePoolTransformer({ stakePool: pool, cardanoCoin });
        const logo = getRandomIcon({ id: pool.id.toString(), size: 30 });

        return {
          logo,
          stakePool: pool,
          ...stakePool,
          hexId: pool.hexId,
          ...(pool.metrics && { blocks: compactNumberWithUnit(pool.metrics.blocksCreated) }),
          onClick: (): void => {
            analytics.sendEventToMatomo({
              category: MatomoEventCategories.STAKING,
              action: MatomoEventActions.CLICK_EVENT,
              name: AnalyticsEventNames.Staking.VIEW_STAKEPOOL_INFO_BROWSER
            });
            analytics.sendEventToPostHog(PostHogAction.StakingStakePoolClick);
            setSelectedStakePool({ logo, ...pool });
            setIsDrawerVisible(true);
          },
          onStake: (e: React.MouseEvent<HTMLDivElement, MouseEvent>, poolId: string) => {
            e.stopPropagation();
            setSelectedStakePool(pool);
            onStake(poolId);
          }
        };
      }) || [],
    [stakePools, cardanoCoin, analytics, setSelectedStakePool, setIsDrawerVisible, onStake]
  );

  const onSortChange = (field: Columns) => {
    if (!Object.keys(SortField).includes(field)) return;
    const order =
      field === sort?.field
        ? (sort?.order === SortDirection.asc && SortDirection.desc) || SortDirection.asc
        : SortDirection.asc;

    setSort({ field: field as unknown as SortField, order });
  };

  const isActiveSortItem = (value: string) => value === sort?.field;

  return (
    <div data-testid="stake-pool-table" className={styles.table}>
      <div className={styles.header}>
        <div className={styles.title}>
          <span>{t('browserView.staking.stakePoolsTable.title')}</span>
          <Text data-testid="section-title-counter" className={styles.sideText}>
            ({totalResultCount || 0})
          </Text>
        </div>
        <Search
          className={styles.search}
          withSearchIcon
          inputPlaceholder={t('browserView.staking.stakePoolsTable.searchPlaceholder')}
          onChange={onSearch}
          data-testid="search-input"
          loading={fetchingPools}
        />
      </div>
      <div style={{ marginTop: '16px' }}>
        <div className={styles.stakepoolTable} data-testid="stake-pool-list-container">
          <StakePoolTableHeaderBrowser
            activeSort={sort}
            translations={tableHeaderTranslations}
            isActiveSortItem={isActiveSortItem}
            onSortChange={onSortChange}
          />
        </div>
        <StakePoolTableBodyBrowser
          items={list}
          loadMoreData={loadMoreData}
          emptyText
          total={isSearching ? 0 : totalResultCount}
          emptyPlaceholder={!fetchingPools && !isSearching && <StakePoolsTableEmpty />}
          // Show skeleton if it's loading the list while a search is not being performed
          showSkeleton={isLoadingList && !isSearching}
          scrollableTargetId={scrollableTargetId}
          ItemRenderer={StakePoolItemBrowser}
        />
      </div>
    </div>
  );
};
