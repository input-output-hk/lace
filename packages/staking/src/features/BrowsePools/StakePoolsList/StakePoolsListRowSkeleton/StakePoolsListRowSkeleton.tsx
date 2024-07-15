import { Box, Flex } from '@input-output-hk/lace-ui-toolkit';
import cn from 'classnames';
import { useOutsideHandles } from 'features/outside-handles-provider';
import { stakePoolCellPlaceholderRenderer } from './StakePoolSkeletonCellRenderer';
import * as styles from './StakePoolsListRowSkeleton.css';

export type StakePoolsListRowSkeletonProps<E extends string> = {
  index: number;
  columns: E[];
  dataTestId?: string;
};

export const StakePoolsListRowSkeleton = <E extends string>({
  index,
  columns,
  dataTestId,
}: StakePoolsListRowSkeletonProps<E>) => {
  const { isSharedWallet } = useOutsideHandles();

  return (
    <div
      data-testid="stake-pool-list-row-skeleton"
      className={cn(styles.row, {
        [styles.selectableRow]: !isSharedWallet,
      })}
    >
      {!isSharedWallet && <Box />}
      {columns.map((cell, cellIndex) => (
        <Flex key={cell} className={styles.cell} data-testid={`${dataTestId}-placeholder-list-${cell}`}>
          {stakePoolCellPlaceholderRenderer(index + cellIndex)}
        </Flex>
      ))}
    </div>
  );
};
