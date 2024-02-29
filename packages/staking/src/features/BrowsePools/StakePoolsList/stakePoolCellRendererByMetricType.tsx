/* eslint-disable react/no-multi-comp */
import { Flex } from '@lace/ui';
import cn from 'classnames';
import isNil from 'lodash/isNil';
import { SortField } from '../types';
import { getSaturationLevel } from './config';
import * as styles from './StakePoolCellRenderer.css';
import { StakePoolsListRowProps } from './types';

const numberWithUnitRenderer = ({ value }: { value?: Partial<StakePoolsListRowProps>[SortField] }) => (
  <span>{typeof value === 'object' ? `${value.number}${value.unit}` : '-'}</span>
);
const percentageRenderer = ({ value }: { value?: Partial<StakePoolsListRowProps>[SortField] }) => (
  <span>{typeof value === 'string' ? value : '-'}%</span>
);

export const stakePoolCellRendererByMetricType: Partial<
  Record<SortField, React.FunctionComponent<{ value?: Partial<StakePoolsListRowProps>[SortField] }>>
> = {
  cost: numberWithUnitRenderer,
  liveStake: numberWithUnitRenderer,
  margin: percentageRenderer,
  pledge: numberWithUnitRenderer,
  ros: percentageRenderer,
  saturation: ({ value }) => {
    if (typeof value !== 'string' || isNil(value)) return <>'-'</>;
    const saturationColor: styles.DotVariants['level'] = getSaturationLevel(Number.parseFloat(value.toString()));
    return (
      <Flex alignItems="center">
        <Flex mr="$6" className={cn(styles.dot({ level: saturationColor }))} />
        {value}%
      </Flex>
    );
  },
};
