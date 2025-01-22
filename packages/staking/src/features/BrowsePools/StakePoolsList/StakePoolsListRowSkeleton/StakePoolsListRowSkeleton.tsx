import { Box, Flex } from '@input-output-hk/lace-ui-toolkit';
import cn from 'classnames';
import { stakePoolCellPlaceholderRenderer } from './StakePoolSkeletonCellRenderer';
import * as styles from './StakePoolsListRowSkeleton.css';

export type StakePoolsListRowSkeletonProps<E extends string> = {
  index: number;
  columns: E[];
  dataTestId?: string;
  withSelection?: boolean;
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
      [styles.selectableRow]: withSelection,
    })}
  >
    {withSelection && <Box />}
    {columns.map((cell, cellIndex) => (
      <Flex key={cell} className={styles.cell} testId={`${dataTestId}-placeholder-list-${cell}`}>
        {stakePoolCellPlaceholderRenderer(index + cellIndex)}
      </Flex>
    ))}
  </div>
);
