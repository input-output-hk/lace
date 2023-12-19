/* eslint-disable react/no-multi-comp */
import cn from 'classnames';
import isNil from 'lodash/isNil';
import { Columns } from '../types';
import { getSaturationLevel } from '../utils';
import * as styles from './StakePoolCellRenderer.css';

export const stakePoolCellRenderer = {
  [Columns.saturation]: ({ value }: { value: string }) => {
    if (isNil(value)) return '-';
    const saturationColor = getSaturationLevel(Number.parseFloat(value.toString()));
    return (
      <div className={styles.dotWrapper}>
        <span className={cn(styles.dot, styles[saturationColor])} />
        {value}%
      </div>
    );
  },
  [Columns.margin]: ({ value }: { value: string }) => <span>{value}%</span>,
} as Record<Columns, React.FunctionComponent<{ value?: string }>>;
