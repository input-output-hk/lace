import { Box, Flex } from '@lace/ui';
import cn from 'classnames';
import React from 'react';
import * as styles from './StakePoolPlaceholder.css';
import { stakePoolCellPlaceholderRenderer } from './StakePoolPlaceholderCellRenderer';

export type StakePoolPlaceholderProps<E extends string> = {
  index: number;
  columns: E[];
  withSelection?: boolean;
  dataTestId?: string;
};

export const StakePoolPlaceholder = function StakePoolPlaceholder<E extends string>({
  index,
  columns,
  dataTestId,
  withSelection,
}: StakePoolPlaceholderProps<E>): React.ReactElement {
  return (
    <div
      data-testid={`${dataTestId}-placeholder-item`}
      className={cn(styles.row, {
        [styles.selectable]: withSelection,
      })}
    >
      {withSelection && (
        <Flex className={styles.cell}>
          <Box w="$16" h="$16" className={styles.checkbox} />
        </Flex>
      )}
      {columns.map((cell, cellIndex) => (
        <Flex key={cell} className={styles.cell} data-testid={`${dataTestId}-placeholder-list-${cell}`}>
          {stakePoolCellPlaceholderRenderer(index + cellIndex)}
        </Flex>
      ))}
    </div>
  );
};
