/* eslint-disable react/no-multi-comp */
import { Box, Flex, Table, Text, useVisibleItemsCount } from '@input-output-hk/lace-ui-toolkit';
import { useOutsideHandles } from 'features/outside-handles-provider';
import React, { ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ListRange } from 'react-virtuoso';
import { StakePoolDetails } from '../../store';
import { StakePoolSortOptions } from '../types';
import { config } from './config';
import * as styles from './StakePoolsList.css';
import { StakePoolsListHeader } from './StakePoolsListHeader';
import { StakePoolsListRow } from './StakePoolsListRow';
import { StakePoolsListRowSkeleton } from './StakePoolsListRowSkeleton';

export type StakePoolsListProps = {
  scrollableTargetId: string;
  pools: (StakePoolDetails | undefined)[];
  selectedPools: StakePoolDetails[];
  loadMoreData: (range: ListRange) => void;
  setActiveSort: (props: StakePoolSortOptions) => void;
  activeSort?: StakePoolSortOptions;
  emptyPlaceholder: () => ReactElement;
  showSkeleton?: boolean;
};

const increaseViewportBy = { bottom: 100, top: 0 };
const DEFAULT_ROW_HIGHT = 44;

export const StakePoolsList = ({
  emptyPlaceholder: EmptyPlaceholder,
  loadMoreData,
  pools,
  selectedPools,
  activeSort,
  setActiveSort,
  showSkeleton,
  scrollableTargetId,
}: StakePoolsListProps): React.ReactElement => {
  const { t } = useTranslation();
  const { isSharedWallet } = useOutsideHandles();
  const tableReference = useRef<HTMLDivElement | null>(null);
  const [initialItemsCount, setInitialItemsCount] = useState(0);
  const showEmptyPlaceholder = !showSkeleton && pools.length === 0;

  const initialItemsLimit = useVisibleItemsCount({
    containerRef: tableReference,
    rowHeight: DEFAULT_ROW_HIGHT,
  });

  useEffect(() => {
    if (initialItemsLimit !== undefined) {
      const overscanRows = Math.ceil(increaseViewportBy.bottom / DEFAULT_ROW_HIGHT);

      setInitialItemsCount(overscanRows + Math.max(initialItemsLimit, 0));
    }
  }, [initialItemsLimit]);

  useEffect(() => {
    if (initialItemsCount !== undefined) {
      loadMoreData({
        endIndex: initialItemsCount,
        startIndex: 0,
      });
    }
  }, [initialItemsCount, loadMoreData]);

  const rowPlaceholders = useMemo(() => Array.from<undefined>({ length: initialItemsCount }), [initialItemsCount]);

  const itemContent = useCallback(
    (index: number, data: StakePoolDetails | undefined): React.ReactElement =>
      data ? (
        <StakePoolsListRow {...data} />
      ) : (
        <StakePoolsListRowSkeleton index={index} columns={config.columns} withSelection={!isSharedWallet} />
      ),
    [isSharedWallet]
  );

  return (
    <Box className={styles.box} w="$fill" testId="stake-pools-list-container">
      {selectedPools?.length > 0 && (
        <Box w="$fill" pb="$6">
          <Text.Body.Normal className={styles.selectedTitle} weight="$semibold">
            {t('browsePools.stakePoolGrid.selected')}
          </Text.Body.Normal>
        </Box>
      )}
      <StakePoolsListHeader {...{ activeSort, setActiveSort }} />
      {selectedPools?.length > 0 && (
        <Flex
          flexDirection="column"
          alignItems="stretch"
          mb="$24"
          pb="$16"
          className={styles.selectedPools}
          data-testid="selected-pools-list"
        >
          {selectedPools.map((pool) => (
            <StakePoolsListRow key={pool.id} {...{ ...pool, selected: true }} />
          ))}
        </Flex>
      )}
      {showEmptyPlaceholder && <EmptyPlaceholder />}
      <Table.Body<StakePoolDetails | undefined>
        tableReference={tableReference}
        scrollableTargetId={scrollableTargetId}
        loadMoreData={loadMoreData}
        totalCount={showSkeleton ? rowPlaceholders.length : pools.length}
        items={showSkeleton ? rowPlaceholders : pools}
        itemContent={itemContent}
        increaseViewportBy={increaseViewportBy}
      />
    </Box>
  );
};
