/* eslint-disable no-magic-numbers */
import { Box, Text } from '@lace/ui';
import { SortField } from 'features/BrowsePools/types';
import debounce from 'lodash/debounce';
import { ReactElement, useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import { ListRange } from 'react-virtuoso';
import useResizeObserver, { ObservedSize } from 'use-resize-observer';
import { StakePoolDetails } from '../../store';
import { STAKE_POOL_CARD_HEIGHT, StakePoolCardSkeleton } from '../StakePoolCard';
import { Grid } from './Grid';
import * as styles from './StakePoolsGrid.css';
import { StakePoolsGridItem } from './StakePoolsGridItem';
import { StakePoolsGridSkeleton } from './StakePoolsGridSkeleton';
import { StakePoolsGridColumnCount } from './types';

const DEFAULT_DEBOUNCE = 200;

export type StakePoolsGridProps = {
  scrollableTargetId: string;
  pools: (StakePoolDetails | undefined)[];
  selectedPools: StakePoolDetails[];
  loadMoreData: (range: ListRange) => void;
  emptyPlaceholder: () => ReactElement;
  showSkeleton?: boolean;
  sortField: SortField;
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
  const [containerWidth, setContainerWidth] = useState<number>();
  const [numberOfItemsPerRow, setNumberOfItemsPerRow] = useState<StakePoolsGridColumnCount>();

  const showEmptyPlaceholder = !showSkeleton && pools.length === 0;
  const matchTwoColumnsLayout = useMediaQuery({ maxWidth: 668 });
  const matchThreeColumnsLayout = useMediaQuery({ maxWidth: 1024, minWidth: 669 });
  const matchFourColumnsLayout = useMediaQuery({ minWidth: 1025 });

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

  return (
    <div ref={ref} data-testid="stake-pools-grid-container">
      {selectedPools?.length > 0 && (
        <>
          <Text.Body.Normal className={styles.selectedTitle} weight="$semibold">
            {t('browsePools.stakePoolGrid.selected')}
          </Text.Body.Normal>
          <Box w="$fill" mt="$16" className={styles.grid} data-testid="selected-pools-list">
            {selectedPools.map((pool) => (
              <StakePoolsGridItem key={pool.id} sortField={sortField} {...pool} />
            ))}
          </Box>
          <Box className={styles.separator} />
        </>
      )}
      {showEmptyPlaceholder && <EmptyPlaceholder />}
      {showSkeleton || !numberOfItemsPerRow ? (
        <StakePoolsGridSkeleton columnCount={columnCount} rowCount={2} />
      ) : (
        <Grid<StakePoolDetails | undefined>
          parentRef={ref}
          rowHeight={STAKE_POOL_CARD_HEIGHT}
          numberOfItemsPerRow={numberOfItemsPerRow}
          scrollableTargetId={scrollableTargetId}
          loadMoreData={loadMoreData}
          items={pools}
          itemContent={(index, data) =>
            data ? (
              <StakePoolsGridItem sortField={sortField} {...data} />
            ) : (
              <StakePoolCardSkeleton fadeScale={columnCount} index={index} />
            )
          }
        />
      )}
    </div>
  );
};
