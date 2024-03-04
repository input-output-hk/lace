/* eslint-disable react/no-multi-comp */
import { Flex } from '@lace/ui';
import cn from 'classnames';
import isNil from 'lodash/isNil';
import { MetricType } from '../types';
import { getSaturationLevel } from '../utils';
import * as styles from './StakePoolCellRenderer.css';
import { StakePoolsListRowProps } from './types';

export const stakePoolCellRendererByMetricType: Partial<
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
