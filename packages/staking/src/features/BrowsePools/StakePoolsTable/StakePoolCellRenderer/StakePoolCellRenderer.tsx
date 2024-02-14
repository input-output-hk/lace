/* eslint-disable react/no-multi-comp */
import { Flex } from '@lace/ui';
import cn from 'classnames';
import { MetricType } from 'features/BrowsePools/types';
import isNil from 'lodash/isNil';
import { StakePoolsListRowProps } from '../StakePoolsList/types';
import { getSaturationLevel } from '../utils';
import * as styles from './StakePoolCellRenderer.css';

export const stakePoolCellRenderer: Partial<
  Record<MetricType, React.FunctionComponent<{ value?: Partial<StakePoolsListRowProps>[MetricType] }>>
> = {
  [MetricType.saturation]: ({ value }) => {
    if (typeof value !== 'string' || isNil(value)) return <>'-'</>;
    const saturationColor: styles.DotVariants['level'] = getSaturationLevel(Number.parseFloat(value.toString()));
    return (
      <Flex alignItems="center">
        <Flex mr="$6" className={cn(styles.dot({ level: saturationColor }))} />
        {value}%
      </Flex>
    );
  },
  [MetricType.margin]: ({ value }) => <span>{typeof value === 'string' ? value : '-'}%</span>,
  [MetricType.liveStake]: ({ value }) => (
    <span>{typeof value === 'object' ? `${value.number}${value.unit}` : '-'}</span>
  ),
  [MetricType.cost]: ({ value }) => <span>{typeof value === 'object' ? `${value.number}${value.unit}` : '-'}</span>,
  [MetricType.pledge]: ({ value }) => <span>{typeof value === 'object' ? `${value.number}${value.unit}` : '-'}</span>,
};
