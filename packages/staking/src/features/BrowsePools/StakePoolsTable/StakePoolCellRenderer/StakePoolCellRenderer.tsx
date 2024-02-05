/* eslint-disable react/no-multi-comp */
import cn from 'classnames';
import isNil from 'lodash/isNil';
import { StakePoolsListRowProps } from '../StakePoolsList/types';
import { MetricType } from '../types';
import { getSaturationLevel } from '../utils';
import * as styles from './StakePoolCellRenderer.css';

export const stakePoolCellRenderer: Partial<
  Record<MetricType, React.FunctionComponent<{ value?: Partial<StakePoolsListRowProps>[MetricType] }>>
> = {
  [MetricType.saturation]: ({ value }) => {
    if (typeof value !== 'string' || isNil(value)) return <>'-'</>;
    const saturationColor: styles.DotVariants['level'] = getSaturationLevel(Number.parseFloat(value.toString()));
    return (
      <div className={styles.dotWrapper}>
        <span className={cn(styles.dot({ level: saturationColor }))} />
        {value}%
      </div>
    );
  },
  [MetricType.margin]: ({ value }) => <span>{typeof value === 'string' ? value : ''}%</span>,
  [MetricType.liveStake]: ({ value }) => (
    <span>{typeof value === 'object' ? `${value.number}${value.unit}` : '-'}</span>
  ),
  [MetricType.cost]: ({ value }) => <span>{typeof value === 'object' ? `${value.number}${value.unit}` : '-'}</span>,
  [MetricType.pledge]: ({ value }) => <span>{typeof value === 'object' ? `${value.number}${value.unit}` : '-'}</span>,
};
