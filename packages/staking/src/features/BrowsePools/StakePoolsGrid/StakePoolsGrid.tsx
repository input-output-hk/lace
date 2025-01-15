/* eslint-disable no-magic-numbers */
import { Box, Text, useVisibleItemsCount } from '@input-output-hk/lace-ui-toolkit';
import { VirtualisedGrid } from '@lace/common';
import { SortField } from 'features/BrowsePools/types';
import debounce from 'lodash/debounce';
import { ReactElement, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import { ListRange } from 'react-virtuoso';
import useResizeObserver, { ObservedSize } from 'use-resize-observer';
import { StakePoolDetails } from '../../store';
import { STAKE_POOL_CARD_HEIGHT, STAKE_POOL_GRID_ROW_GAP, StakePoolCardSkeleton } from '../StakePoolCard';
import * as styles from './StakePoolsGrid.css';
import { StakePoolsGridItem } from './StakePoolsGridItem';
import { StakePoolsGridColumnCount } from './types';

const DEFAULT_DEBOUNCE = 200;
const increaseViewportBy = { bottom: 100, top: 0 };

export type StakePoolsGridProps = {
  scrollableTargetId: string;
  pools: (StakePoolDetails | undefined)[];
  selectedPools: StakePoolDetails[];
  loadMoreData: (range: ListRange) => void;
  emptyPlaceholder: () => ReactElement;
  showSkeleton?: boolean;
  sortField?: SortField;
};

export const StakePoolsGrid = ({
  emptyPlaceholder: EmptyPlaceholder,
  loadMoreData,
  pools,
  selectedPools,
  sortField,
  showSkeleton,
  scrollableTargetId,
}: StakePoolsGridProps) => {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const tableReference = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>();
  const [numberOfItemsPerRow, setNumberOfItemsPerRow] = useState<StakePoolsGridColumnCount>();
  const [initialItemsCount, setInitialItemsCount] = useState(0);

  const showEmptyPlaceholder = !showSkeleton && pools.length === 0;
  const matchTwoColumnsLayout = useMediaQuery({ maxWidth: 668 });
  const matchThreeColumnsLayout = useMediaQuery({ maxWidth: 1660, minWidth: 668 });
  const matchFourColumnsLayout = useMediaQuery({ minWidth: 1660 });

  const numberOfItemsPerMediaQueryMap: Partial<Record<StakePoolsGridColumnCount, boolean>> = useMemo(
    () => ({
      2: matchTwoColumnsLayout,
      3: matchThreeColumnsLayout,
      4: matchFourColumnsLayout,
    }),
    [matchFourColumnsLayout, matchThreeColumnsLayout, matchTwoColumnsLayout]
  );

  const updateNumberOfItemsInRow = useCallback(() => {
    if (!ref?.current) return;

    const result = Number(
      Object.entries(numberOfItemsPerMediaQueryMap).find(([, matches]) => matches)?.[0]
    ) as StakePoolsGridColumnCount;

    setNumberOfItemsPerRow(result);
  }, [numberOfItemsPerMediaQueryMap]);

  const setContainerWidthCb = useCallback(
    (size: ObservedSize) => {
      if (size.width !== containerWidth) {
        updateNumberOfItemsInRow();
        setContainerWidth(size.width);
      }
    },
    [containerWidth, updateNumberOfItemsInRow]
  );

  const onResize = useMemo(
    () => debounce(setContainerWidthCb, DEFAULT_DEBOUNCE, { leading: true }),
    [setContainerWidthCb]
  );

  const columnCount = numberOfItemsPerRow || 3;

  useResizeObserver<HTMLDivElement>({ onResize, ref });

  const initialRowsCount = useVisibleItemsCount({
    containerRef: tableReference,
    rowHeight: STAKE_POOL_CARD_HEIGHT + STAKE_POOL_GRID_ROW_GAP,
  });

  useLayoutEffect(() => {
    if (initialRowsCount !== undefined && numberOfItemsPerRow !== undefined) {
      const overscanRows = Math.ceil(increaseViewportBy.bottom / STAKE_POOL_CARD_HEIGHT);

      setInitialItemsCount((overscanRows + Math.max(initialRowsCount, 0)) * numberOfItemsPerRow);
    }
  }, [initialRowsCount, numberOfItemsPerRow]);

  useLayoutEffect(() => {
    if (tableReference && initialItemsCount) {
      loadMoreData({ endIndex: initialItemsCount, startIndex: 0 });
    }
  }, [initialItemsCount, loadMoreData]);

  const itemContent = useCallback(
    (index: number, data: StakePoolDetails | undefined): React.ReactElement =>
      data ? <StakePoolsGridItem {...data} /> : <StakePoolCardSkeleton fadeScale={columnCount} index={index} />,
    [columnCount]
  );

  const cardsPlaceholders = useMemo(() => Array.from<undefined>({ length: initialItemsCount }), [initialItemsCount]);

  return (
    <div ref={ref} data-testid="stake-pools-grid-container">
      {selectedPools?.length > 0 && (
        <>
          <Text.Body.Normal className={styles.selectedTitle} weight="$semibold">
            {t('browsePools.stakePoolGrid.selected')}
          </Text.Body.Normal>
          <Box w="$fill" mt="$16" className={styles.grid} testId="selected-pools-list">
            {selectedPools.map((pool) => (
              <StakePoolsGridItem key={pool.id} sortField={sortField} {...pool} />
            ))}
          </Box>
          <Box className={styles.separator} />
        </>
      )}
      {showEmptyPlaceholder && <EmptyPlaceholder />}
      <VirtualisedGrid<StakePoolDetails | undefined>
        testId="stake-pool-list-scroll-wrapper"
        tableReference={tableReference}
        scrollableTargetId={scrollableTargetId}
        loadMoreData={loadMoreData}
        items={showSkeleton ? cardsPlaceholders : pools}
        totalCount={showSkeleton ? cardsPlaceholders.length : pools.length}
        itemContent={itemContent}
      />
    </div>
  );
};
