import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import debounce from 'lodash/debounce';
import { Box, Table } from '@lace/ui';
import { Wallet } from '@lace/cardano';
import {
  mapStakePoolToDisplayData,
  SortField,
  StakePoolsListRowProps,
  StakePoolsListRowSkeleton,
  StakePoolSortOptions,
  stakePoolTableConfig,
  TranslationsFor
} from '@lace/staking';
import { Typography } from 'antd';
import { Search } from '@lace/common';
import { useTranslation } from 'react-i18next';
import { stakePoolResultsSelector } from '@stores/selectors/staking-selectors';
import { useDelegationStore } from '@src/features/delegation/stores';
import { useWalletStore } from '@stores';
import { useStakePoolDetails } from '../../store';
import { StakePoolsTableEmpty } from './StakePoolsTableEmpty';
import styles from './StakePoolsTable.modules.scss';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';

const { Text } = Typography;

type stakePoolsTableProps = {
  scrollableTargetId: string;
};

type LoadMoreDataParam = Parameters<typeof Table.Body>[0]['loadMoreData'];

const DEFAULT_SORT_OPTIONS: StakePoolSortOptions = {
  field: 'ticker',
  order: 'desc'
};

const searchDebounce = 300;

export const StakePoolsTable = ({ scrollableTargetId }: stakePoolsTableProps): React.ReactElement => {
  const componentRef = useRef<HTMLDivElement | null>(null);
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = useState<string>('');
  const [sort, setSort] = useState<StakePoolSortOptions>(DEFAULT_SORT_OPTIONS);
  const { setSelectedStakePool } = useDelegationStore();
  const { setIsDrawerVisible } = useStakePoolDetails();
  const analytics = useAnalyticsContext();

  const {
    stakePoolSearchResults: { pageResults, totalResultCount },
    isSearching: fetchingPools,
    resetStakePools,
    fetchStakePools
  } = useWalletStore(stakePoolResultsSelector);
  const { blockchainProvider } = useWalletStore();

  const tableHeaderTranslations: TranslationsFor<SortField> = {
    ticker: t('cardano.stakePoolTableBrowser.tableHeader.ticker.title'),
    ros: t('cardano.stakePoolTableBrowser.tableHeader.ros.title'),
    cost: t('cardano.stakePoolTableBrowser.tableHeader.cost.title'),
    saturation: t('cardano.stakePoolTableBrowser.tableHeader.saturation.title'),
    margin: t('cardano.stakePoolTableBrowser.tableHeader.margin.title'),
    blocks: t('cardano.stakePoolTableBrowser.tableHeader.blocks.title'),
    pledge: t('cardano.stakePoolTableBrowser.tableHeader.pledge.title'),
    liveStake: t('cardano.stakePoolTableBrowser.tableHeader.liveStake.title')
  };
  const tableHeaderTooltipsTranslations: TranslationsFor<SortField> = {
    ticker: t('cardano.stakePoolTableBrowser.tableHeader.ticker.tooltip'),
    ros: t('cardano.stakePoolTableBrowser.tableHeader.ros.tooltip'),
    cost: t('cardano.stakePoolTableBrowser.tableHeader.cost.tooltip'),
    saturation: t('cardano.stakePoolTableBrowser.tableHeader.saturation.tooltip'),
    margin: t('cardano.stakePoolTableBrowser.tableHeader.margin.tooltip'),
    blocks: t('cardano.stakePoolTableBrowser.tableHeader.blocks.tooltip'),
    pledge: t('cardano.stakePoolTableBrowser.tableHeader.pledge.tooltip'),
    liveStake: t('cardano.stakePoolTableBrowser.tableHeader.liveStake.tooltip')
  };

  const debouncedSearch = useMemo(() => debounce(fetchStakePools, searchDebounce), [fetchStakePools]);

  const loadMoreData = useCallback(
    ({ startIndex, endIndex }: Parameters<LoadMoreDataParam>[0]) => {
      if (startIndex !== endIndex) {
        debouncedSearch({ limit: endIndex, searchString: searchValue, skip: startIndex, sort });
      }
    },
    [debouncedSearch, searchValue, sort]
  );

  useEffect(() => {
    if (!componentRef?.current) return;
    // Fetch pools on network switching, searchValue change and sort change
    setIsDrawerVisible(false);
    resetStakePools();
  }, [blockchainProvider, searchValue, sort, debouncedSearch, setIsDrawerVisible, resetStakePools]);

  const onSearch = (searchString: string) => {
    setSearchValue(searchString);
  };
  const list = useMemo(
    () => pageResults?.map((pool) => (pool ? mapStakePoolToDisplayData({ stakePool: pool }) : undefined)),
    [pageResults]
  );

  const onPoolClick = (pool: Wallet.Cardano.StakePool) => {
    analytics.sendEventToPostHog(PostHogAction.StakingStakePoolClick);
    setSelectedStakePool(pool);
    setIsDrawerVisible(true);
  };

  const onSortChange = (sortField: SortField) => {
    const order = sortField === sort?.field && sort?.order === 'asc' ? 'desc' : 'asc';

    setSort({ field: sortField, order });
  };

  const headers = stakePoolTableConfig.columns.map((column: MetricType) => {
    const tooltipText = t(`cardano.stakePoolTableBrowser.tableHeader.${column}.tooltip`);
    return {
      label: tableHeaderTranslations[column as SortField],
      ...(tableHeaderTooltipsTranslations[column as SortField] && { tooltipText }),
      value: column
    };
  });

  const isActiveSortItem = (value: string) => value === sort?.field;

  return (
    <div ref={componentRef} data-testid="stake-pool-table" className={styles.table}>
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
      <Box mt="$16" data-testid="stake-pool-list-container">
        <Table.Header
          dataTestId="stake-pool"
          headers={headers}
          isActiveSortItem={isActiveSortItem}
          onSortChange={onSortChange}
          order={sort?.order}
        />
        {!fetchingPools && totalResultCount === 0 && <StakePoolsTableEmpty />}
        <Table.Body<StakePoolsListRowProps>
          scrollableTargetId={scrollableTargetId}
          loadMoreData={loadMoreData}
          items={list}
          itemContent={(index, props) => {
            if (!props) {
              return <StakePoolsListRowSkeleton index={index} columns={stakePoolTableConfig.columns} />;
            }
            const { stakePool } = props;
            return (
              <Table.Row<StakePoolsListRowProps>
                onClick={() => onPoolClick(stakePool)}
                columns={stakePoolTableConfig.columns}
                cellRenderers={stakePoolTableConfig.renderer}
                dataTestId="stake-pool"
                data={props}
              />
            );
          }}
          increaseViewportBy={{ bottom: 100, top: 0 }}
        />
      </Box>
    </div>
  );
};
