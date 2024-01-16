/* eslint-disable react/no-multi-comp */
import cn from 'classnames';
import isNil from 'lodash/isNil';
import { Columns } from '../types';
import { getSaturationLevel } from '../utils';
import * as styles from './StakePoolCellRenderer.css';

export const stakePoolCellRenderer: Partial<Record<Columns, React.FunctionComponent<{ value?: string }>>> = {
  [Columns.saturation]: ({ value }: { value?: string }) => {
    if (isNil(value)) return <>'-'</>;
    const saturationColor: styles.DotVariants['level'] = getSaturationLevel(Number.parseFloat(value.toString()));
    return (
      <div className={styles.dotWrapper}>
        <span className={cn(styles.dot({ level: saturationColor }))} />
        {value}%
      </div>
    );
  },
  [Columns.margin]: ({ value }: { value?: string }) => <span>{value}%</span>,
  [Columns.liveStake]: ({ value }: { value?: string }) => <span>{value}%</span>,
};
