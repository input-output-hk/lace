import { Flex, Text } from '@lace/ui';
import AdaIcon from 'assets/icons/ada.svg';
import ChartPieIcon from 'assets/icons/chart-pie.svg';
import CubeIcon from 'assets/icons/cube.svg';
import { ReactNode } from 'react';
import { SortField } from '../../types';
import * as styles from './PoolMetric.css';

// type StringMetrics = Exclude<SortField, 'cost' | 'pledge' | 'liveStake'>;

// type StringMetricProps = {
//   metricType: StringMetrics;
//   metricValue: string;
// };

// type NumberMetricProps = {
//   metricType: Exclude<SortField, StringMetrics>;
//   metricValue: { number: number; unit: UnitSymbol };
// };

// type PoolMetricProps = StringMetricProps | NumberMetricProps;

type PoolMetricProps = {
  metricType: SortField;
  metricValue: string;
};

const iconsByType: Record<SortField, ReactNode> = {
  blocks: <CubeIcon className={styles.icon} />,
  cost: <AdaIcon className={styles.icon} />,
  liveStake: <Text.Body.Normal weight="$semibold">LS</Text.Body.Normal>,
  margin: <ChartPieIcon className={styles.icon} />,
  pledge: <AdaIcon className={styles.icon} />,
  ros: null,
  saturation: null,
  ticker: null,
};

export const PoolMetric = ({ metricType, metricValue }: PoolMetricProps) => (
  <Flex alignItems="center" gap="$4" className={styles.metric}>
    {iconsByType[metricType]}
    <Text.Body.Small weight="$medium">{metricValue}</Text.Body.Small>
  </Flex>
);
