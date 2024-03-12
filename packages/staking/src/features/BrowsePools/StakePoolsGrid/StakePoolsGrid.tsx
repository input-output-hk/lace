/* eslint-disable no-magic-numbers */
import { Box, Text } from '@lace/ui';
import { SortField } from 'features/BrowsePools/types';
import debounce from 'lodash/debounce';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import { ListRange } from 'react-virtuoso';
import useResizeObserver, { ObservedSize } from 'use-resize-observer';
import { STAKE_POOL_CARD_HEIGHT, StakePoolCardSkeleton } from '../StakePoolCard';
import { StakePoolsListRowProps } from '../StakePoolsList/types';
import { Grid } from './Grid';
import * as styles from './StakePoolsGrid.css';
import { StakePoolsGridItem } from './StakePoolsGridItem';

const DEFAULT_DEBOUNCE = 200;

type numOfItemsType = 3 | 4 | 5;

export type StakePoolsGridProps = {
  scrollableTargetId: string;
  pools: (StakePoolsListRowProps | undefined)[];
  selectedPools: StakePoolsListRowProps[];
  loadMoreData: (range: ListRange) => void;
  emptyPlaceholder?: React.ReactNode;
  sortField: SortField;
};

export const StakePoolsGrid = ({
  emptyPlaceholder,
  loadMoreData,
  pools,
  selectedPools,
  sortField,
  scrollableTargetId,
}: StakePoolsGridProps) => {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>();
  const [numberOfItemsPerRow, setNumberOfItemsPerRow] = useState<numOfItemsType>();

  const matchThreeColumnsLayout = useMediaQuery({ maxWidth: 1023 });
  const matchFourColumnsLayout = useMediaQuery({ maxWidth: 1659, minWidth: 1024 });
  const matchFiveColumnsLayout = useMediaQuery({ minWidth: 1660 });

  const numberOfItemsPerMediaQueryMap: Partial<Record<numOfItemsType, boolean>> = useMemo(
    () => ({
      3: matchThreeColumnsLayout,
      4: matchFourColumnsLayout,
      5: matchFiveColumnsLayout,
    }),
    [matchFiveColumnsLayout, matchFourColumnsLayout, matchThreeColumnsLayout]
  );

  const updateNumberOfItemsInRow = useCallback(() => {
    if (!ref?.current) return;

    const result = Number(
      Object.entries(numberOfItemsPerMediaQueryMap).find(([, matches]) => matches)?.[0]
    ) as numOfItemsType;

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

  useResizeObserver<HTMLDivElement>({ onResize, ref });

  const poolsLength = pools.length;
  const selectedPoolsLength = selectedPools?.length;

  return (
    <div ref={ref} data-testid="stake-pools-grid-container">
      {selectedPoolsLength > 0 && (
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
      {!(selectedPoolsLength > 0 && selectedPoolsLength === poolsLength) && emptyPlaceholder}
      <Grid<StakePoolsListRowProps | undefined>
        rowHeight={STAKE_POOL_CARD_HEIGHT}
        numberOfItemsPerRow={numberOfItemsPerRow}
        scrollableTargetId={scrollableTargetId}
        loadMoreData={loadMoreData}
        items={pools}
        itemContent={(index, data) =>
          data ? (
            <StakePoolsGridItem sortField={sortField} {...data} />
          ) : (
            <StakePoolCardSkeleton fadeScale={numberOfItemsPerRow || 3} index={index} />
          )
        }
      />
    </div>
  );
};
