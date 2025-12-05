import { Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import AdaIcon from 'assets/icons/ada.svg';
import ChartPieIcon from 'assets/icons/chart-pie.svg';
import CubeIcon from 'assets/icons/cube.svg';
import { ReactNode } from 'react';
import { SortField } from '../../types';
import * as styles from './PoolMetric.css';

type PoolMetricProps = {
  metricType: SortField;
  metricValue: string;
};

const iconsByType: Record<SortField, ReactNode> = {
  blocks: <CubeIcon className={styles.icon} data-testid="stake-pool-metric-icon-blocks" />,
  cost: <AdaIcon className={styles.icon} data-testid="stake-pool-metric-icon-blocks" />,
  liveStake: (
    <Text.Body.Normal weight="$semibold" data-testid="stake-pool-metric-icon-live-stake">
      LS
    </Text.Body.Normal>
  ),
  margin: <ChartPieIcon className={styles.icon} data-testid="stake-pool-metric-icon-margin" />,
  pledge: <AdaIcon className={styles.icon} data-testid="stake-pool-metric-icon-pledge" />,
  ros: null,
  saturation: null,
  ticker: null,
};

export const PoolMetric = ({ metricType, metricValue }: PoolMetricProps) => (
  <Flex alignItems="center" gap="$4" className={styles.metric} testId="stake-pool-metric">
    {iconsByType[metricType]}
    <Text.Body.Small weight="$medium" data-testid="stake-pool-metric-value">
      {metricValue ?? '-'}
    </Text.Body.Small>
  </Flex>
);
