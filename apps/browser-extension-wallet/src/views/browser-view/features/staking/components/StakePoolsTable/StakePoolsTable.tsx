import React, { useEffect, useMemo, useState } from 'react';
import debounce from 'lodash/debounce';
import { Wallet } from '@lace/cardano';
import {
  Columns,
  SortDirection,
  SortField,
  StakePoolSortOptions,
  StakePoolTableBodyBrowser,
  stakePooltableConfig,
  TableHeader,
  TableRow,
  TranslationsFor
} from '@lace/staking';
import { Typography } from 'antd';
import { getRandomIcon, Search } from '@lace/common';
import { useTranslation } from 'react-i18next';
import { stakePoolResultsSelector } from '@stores/selectors/staking-selectors';
import { useDelegationStore } from '@src/features/delegation/stores';
import { useWalletStore } from '@stores';
import { useStakePoolDetails } from '../../store';
import styles from './StakePoolsTable.modules.scss';
import { useAnalyticsContext } from '@providers';
import {
  AnalyticsEventNames,
  MatomoEventActions,
  MatomoEventCategories,
  PostHogAction
} from '@providers/AnalyticsProvider/analyticsTracker';

const { Text } = Typography;

type stakePoolsTableProps = {
  onStake?: (id: string) => void;
  scrollableTargetId: string;
};

const DEFAULT_SORT_OPTIONS: StakePoolSortOptions = {
  field: SortField.name,
  order: SortDirection.desc
};

const searchDebounce = 300;
const defaultFetchLimit = 10;

const isSortingAvailable = (value: string) => Object.keys(SortField).includes(value);

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
    apy: t('cardano.stakePoolTableBrowser.tableHeader.ros.title'),
    cost: t('cardano.stakePoolTableBrowser.tableHeader.cost'),
    saturation: t('cardano.stakePoolTableBrowser.tableHeader.saturation.title'),
    margin: t('cardano.stakePoolTableBrowser.tableHeader.margin.title'),
    blocks: t('cardano.stakePoolTableBrowser.tableHeader.blocks.title'),
    pledge: t('cardano.stakePoolTableBrowser.tableHeader.pledge.title'),
    liveStake: t('cardano.stakePoolTableBrowser.tableHeader.liveStake')
  };
  const tableHeaderTooltipsTranslations: Partial<TranslationsFor<Columns>> = {
    apy: t('cardano.stakePoolTableBrowser.tableHeader.ros.tooltip'),
    saturation: t('cardano.stakePoolTableBrowser.tableHeader.saturation.tooltip'),
    margin: t('cardano.stakePoolTableBrowser.tableHeader.margin.tooltip'),
    blocks: t('cardano.stakePoolTableBrowser.tableHeader.blocks.tooltip'),
    pledge: t('cardano.stakePoolTableBrowser.tableHeader.pledge.tooltip')
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
        // @ts-expect-error TODO: filter pools without metrics (this technically shouldn't happen)
        const stakePool = Wallet.util.stakePoolTransformer({ stakePool: pool, cardanoCoin });
        const logo = getRandomIcon({ id: pool.id.toString(), size: 30 });

        return {
          logo,
          stakePool: pool,
          ...stakePool,
          hexId: pool.hexId,
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
    // TODO: remove once updated on sdk side (LW-9530)
    if (!Object.keys(SortField).includes(field)) return;
    const order = field === sort?.field && sort?.order === SortDirection.asc ? SortDirection.desc : SortDirection.asc;

    setSort({ field: field as unknown as SortField, order });
  };

  const headers = stakePooltableConfig.columns.map((column) => {
    const translationKey = `cardano.stakePoolTableBrowser.tableHeader.${column}.tooltip`;
    const tooltipText = t(translationKey);
    return {
      label: tableHeaderTranslations[column],
      ...(tableHeaderTooltipsTranslations[column] && { tooltipText }),
      value: column
    };
  });

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
          <TableHeader
            dataTestId="stake-pool"
            headers={headers}
            isActiveSortItem={isActiveSortItem}
            isSortingAvailable={isSortingAvailable}
            onSortChange={onSortChange}
            order={sort?.order}
          />
        </div>
        <StakePoolTableBodyBrowser
          // @ts-expect-error TODO: filter pools without metrics (this technically shouldn't happen)
          items={list}
          loadMoreData={loadMoreData}
          emptyText
          total={isSearching ? 0 : totalResultCount}
          // Show skeleton if it's loading the list while a search is not being performed
          showSkeleton={isLoadingList && !isSearching}
          scrollableTargetId={scrollableTargetId}
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          ItemRenderer={({ stakePool, hexId, id, selectionDisabledMessage, onClick, ...data }) => (
            <TableRow<Columns>
              onClick={onClick}
              columns={stakePooltableConfig.columns}
              cellRenderers={stakePooltableConfig.renderer}
              dataTestId="stake-pool"
              data={data as unknown as Parameters<typeof TableRow>[0]['data']}
              selectionDisabledMessage={selectionDisabledMessage}
            />
          )}
        />
      </div>
    </div>
  );
};
