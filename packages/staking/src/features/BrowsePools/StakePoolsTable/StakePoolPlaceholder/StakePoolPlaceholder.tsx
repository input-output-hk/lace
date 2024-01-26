/* eslint-disable @typescript-eslint/no-non-null-assertion */
import cn from 'classnames';
// TODO: remove once replaced with new pool skeleton (LW-9659)
import React from 'react';
import * as styles from './StakePoolPlaceholder.css';
import { stakePoolCellPlaceholderRenderer } from './StakePoolPlaceholderCellRenderer';

export type StakePoolPlaceholderProps<E extends string> = {
  columns: E[];
  withSelection?: boolean;
  dataTestId?: string;
};

export const StakePoolPlaceholder = function StakePoolPlaceholder<E extends string>({
  columns,
  dataTestId,
  withSelection,
}: StakePoolPlaceholderProps<E>): React.ReactElement {
  return (
    <div
      data-testid={`${dataTestId}-placeholder-item`}
      className={cn(styles.row, {
        [styles.selectable!]: withSelection,
      })}
    >
      {withSelection && <div />}
      {columns.map((cell, index) => (
        <div key={`${cell}-${index}`} className={styles.cell} data-testid={`${dataTestId}-placeholder-list-${cell}`}>
          {stakePoolCellPlaceholderRenderer()}
        </div>
      ))}
    </div>
  );
};
