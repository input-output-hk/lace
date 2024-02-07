import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import debounce from 'lodash/debounce';
import { Box, Table } from '@lace/ui';
import { Wallet } from '@lace/cardano';
import {
  Columns,
  SortDirection,
  SortField,
  StakePoolSortOptions,
  TranslationsFor,
  stakePooltableConfig,
  StakePoolTableItemBrowserProps,
  StakePoolPlaceholder
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
  field: SortField.name,
  order: SortDirection.desc
};

const searchDebounce = 300;

const isSortingAvailable = (value: string) => Object.keys(SortField).includes(value);

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

  const loadMoreData = useCallback(
    ({ startIndex, endIndex }: Parameters<LoadMoreDataParam>[0]) => {
      if (startIndex !== endIndex) {
        debouncedSearch({ limit: endIndex, searchString: searchValue, skip: startIndex, sort });
      }
    },
    [debouncedSearch, searchValue, sort]
  );

  useEffect(() => {
    if (componentRef?.current) {
      // Fetch pools on network switching, searchValue change and sort change
      setIsDrawerVisible(false);
      resetStakePools();
    }
  }, [blockchainProvider, searchValue, sort, debouncedSearch, setIsDrawerVisible, resetStakePools]);

  const onSearch = (searchString: string) => {
    setSearchValue(searchString);
  };
  const list = useMemo(
    () =>
      pageResults?.map((pool) =>
        pool ? Wallet.util.stakePoolTransformer({ stakePool: pool, cardanoCoin }) : undefined
      ),
    [cardanoCoin, pageResults]
  );

  const onPoolClick = (pool: Wallet.Cardano.StakePool) => {
    analytics.sendEventToPostHog(PostHogAction.StakingStakePoolClick);
    setSelectedStakePool(pool);
    setIsDrawerVisible(true);
  };

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
          isSortingAvailable={isSortingAvailable}
          onSortChange={onSortChange}
          order={sort?.order}
        />
        {!fetchingPools && totalResultCount === 0 && <StakePoolsTableEmpty />}
        <Table.Body<StakePoolTableItemBrowserProps>
          scrollableTargetId={scrollableTargetId}
          loadMoreData={loadMoreData}
          items={list}
          itemContent={(_index, props) => {
            if (!props) {
              return <StakePoolPlaceholder columns={stakePooltableConfig.columns} />;
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { stakePool, hexId, id, ...data } = props;
            return (
              <Table.Row<typeof data, Columns>
                onClick={() => onPoolClick(stakePool)}
                columns={stakePooltableConfig.columns}
                cellRenderers={stakePooltableConfig.renderer}
                dataTestId="stake-pool"
                data={data}
              />
            );
          }}
          increaseViewportBy={{ bottom: 100, top: 0 }}
        />
      </Box>
    </div>
  );
};
