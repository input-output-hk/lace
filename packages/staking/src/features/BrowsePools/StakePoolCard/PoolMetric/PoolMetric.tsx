import { getNumberWithUnit } from '@lace/common';
import { Flex, Text } from '@lace/ui';
import AdaIcon from 'assets/icons/ada.svg';
import ChartPieIcon from 'assets/icons/chart-pie.svg';
import CubeIcon from 'assets/icons/cube.svg';
import { MetricType } from '../types';
import * as styles from './PoolMetric.css';

interface Props {
  metricType: MetricType;
  metricValue?: number;
}

const iconsByType: Record<MetricType, React.ReactNode> = {
  blocks: <CubeIcon className={styles.icon} />,
  cost: <AdaIcon className={styles.icon} />,
  'live-stake': <Text.Body.Normal weight="$semibold">LS</Text.Body.Normal>,
  margin: <ChartPieIcon className={styles.icon} />,
  pledge: <AdaIcon className={styles.icon} />,
  ros: null,
  saturation: null,
  ticker: null,
};

const getValue = (metricType: MetricType, metricValue: number) => {
  switch (metricType) {
    case 'live-stake':
    case 'pledge':
    case 'blocks':
    case 'cost': {
      const { number, unit } = getNumberWithUnit(metricValue);
      return `${number}${unit}`;
    }
    case 'margin': {
      // eslint-disable-next-line no-magic-numbers
      return `${metricValue.toFixed(2)}%`;
    }
    default: {
      return null;
    }
  }
};

export const PoolMetric = ({ metricType, metricValue }: Props) => {
  const icon = iconsByType[metricType];
  const value = metricValue ? getValue(metricType, metricValue) : '-';
  return (
    <Flex alignItems="center" gap="$4" className={styles.metric}>
      {icon}
      <Text.Body.Small weight="$medium">{value}</Text.Body.Small>
    </Flex>
  );
};
