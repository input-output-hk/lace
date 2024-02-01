/* eslint-disable react/no-multi-comp */
import cn from 'classnames';
import isNil from 'lodash/isNil';
import { StakePoolTableItemBrowserProps } from '../StakePoolTableBrowser/types';
import { Columns } from '../types';
import { getSaturationLevel } from '../utils';
import * as styles from './StakePoolCellRenderer.css';

export const stakePoolCellRenderer: Partial<
  Record<Columns, React.FunctionComponent<{ value?: Partial<StakePoolTableItemBrowserProps>[Columns] }>>
> = {
  [Columns.saturation]: ({ value }) => {
    if (typeof value !== 'string' || isNil(value)) return <>'-'</>;
    const saturationColor: styles.DotVariants['level'] = getSaturationLevel(Number.parseFloat(value.toString()));
    return (
      <div className={styles.dotWrapper}>
        <span className={cn(styles.dot({ level: saturationColor }))} />
        {value}%
      </div>
    );
  },
  [Columns.margin]: ({ value }) => <span>{typeof value !== 'string' ? value : ''}%</span>,
  [Columns.liveStake]: ({ value }) => <span>{typeof value === 'object' ? `${value.number}${value.unit}` : '-'}</span>,
  [Columns.cost]: ({ value }) => <span>{typeof value === 'object' ? `${value.number}${value.unit}` : '-'}</span>,
  [Columns.pledge]: ({ value }) => <span>{typeof value === 'object' ? `${value.number}${value.unit}` : '-'}</span>,
};
