/* eslint-disable no-magic-numbers */
import { Box, Text } from '@lace/ui';
import { SortField } from 'features/BrowsePools/types';
import debounce from 'lodash/debounce';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ListRange } from 'react-virtuoso';
import { StakePoolCardSkeleton } from '../../StakePoolCard';
import { StakePoolsListRowProps } from '../StakePoolsList/types';
import { Grid } from './Grid';
import * as styles from './StakePoolsGrid.css';
import { StakePoolsGridItem } from './StakePoolsGridItem';

const DEFAULT_DEBOUNCE = 200;

const gridCardHeight = 84;

type numOfItemsType = 3 | 4 | 5;

const numberOfItemsPerMediaQueryMap: Partial<Record<numOfItemsType, string>> = {
  3: 'screen and (max-width: 1023px)',
  4: 'screen and (min-width: 1024px) and (max-width: 1659px)',
  5: 'screen and (min-width: 1660px)',
};

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
  const [numberOfItemsPerRow, setNumberOfItemsPerRow] = useState<numOfItemsType | undefined>();

  const getNumberOfItemsInRow = useCallback(() => {
    if (!ref?.current) return;

    const result = Number(
      Object.entries(numberOfItemsPerMediaQueryMap).find(([, query]) => window.matchMedia(query).matches)?.[0]
    ) as numOfItemsType;

    setNumberOfItemsPerRow(result);
  }, []);

  const debouncedGetNumberOfItemsInRow = useMemo(
    () => debounce(getNumberOfItemsInRow, DEFAULT_DEBOUNCE),
    [getNumberOfItemsInRow]
  );

  useEffect(() => {
    window.addEventListener('resize', debouncedGetNumberOfItemsInRow);
    debouncedGetNumberOfItemsInRow();
    return () => {
      window.removeEventListener('resize', debouncedGetNumberOfItemsInRow);
    };
  }, [debouncedGetNumberOfItemsInRow]);

  const poolsLength = pools.length;
  const selectedPoolsLength = selectedPools?.length;

  return (
    <div ref={ref} data-testid="stake-pools-grid-container">
      {selectedPoolsLength > 0 && (
        <>
          <Text.Body.Normal className={styles.selectedTitle} weight="$semibold">
            {t('browsePools.stakePoolGrid.selected')}
          </Text.Body.Normal>
          <Box w="$fill" mt="$16" className={styles.grid}>
            {selectedPools.map((pool) => (
              <StakePoolsGridItem key={pool.id} sortField={sortField} {...pool} />
            ))}
          </Box>
          <Box className={styles.separator} />
        </>
      )}
      {!(selectedPoolsLength > 0 && selectedPoolsLength === poolsLength) && emptyPlaceholder}
      <Grid<StakePoolsListRowProps | undefined>
        rowHeight={gridCardHeight}
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
