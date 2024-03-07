import { Box, Flex } from '@lace/ui';
import cn from 'classnames';
import { stakePoolCellPlaceholderRenderer } from './StakePoolSkeletonCellRenderer';
import * as styles from './StakePoolsListRowSkeleton.css';

export type StakePoolsListRowSkeletonProps<E extends string> = {
  index: number;
  columns: E[];
  withSelection?: boolean;
  dataTestId?: string;
};

export const StakePoolsListRowSkeleton = <E extends string>({
  index,
  columns,
  dataTestId,
  withSelection,
}: StakePoolsListRowSkeletonProps<E>) => (
  <div
    data-testid="stake-pool-list-row-skeleton"
    className={cn(styles.row, {
      [styles.selectable]: withSelection,
    })}
  >
    {withSelection && <Box />}
    {columns.map((cell, cellIndex) => (
      <Flex key={cell} className={styles.cell} data-testid={`${dataTestId}-placeholder-list-${cell}`}>
        {stakePoolCellPlaceholderRenderer(index + cellIndex)}
      </Flex>
    ))}
  </div>
);
