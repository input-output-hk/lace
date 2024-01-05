import { getNumberWithUnit } from '@lace/common';
import AdaIcon from '/src/assets/icons/ada.svg';
import CubeIcon from '/src/assets/icons/cube.svg';
import ChartPieIcon from '/src/assets/icons/chart-pie.svg';
import { Text } from '@lace/ui';
import { MetricType } from '../types';
import * as styles from './PoolMetric.css';

interface Props {
  metricType: MetricType;
  metricValue: number;
}

const getIcon = (metricType: MetricType) => {
  switch (metricType) {
    case 'cost':
    case 'pledge': {
      return <AdaIcon width={14} height={14} />;
    }
    case 'blocks': {
      return <CubeIcon width={17} height={16} />;
    }
    case 'margin': {
      return <ChartPieIcon width={15} height={14} />;
    }
    case 'live-stake': {
      return <Text.Body.Normal className={styles.metricValue}>LS</Text.Body.Normal>;
    }
    default: {
      return null;
    }
  }
};

const getValue = (metricType: MetricType, metricValue: number) => {
  switch (metricType) {
    case 'live-stake':
    case 'pledge':
    case 'blocks':
    case 'cost': {
      const { number, unit } = getNumberWithUnit(metricValue.toString());
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
  const icon = getIcon(metricType);
  const value = getValue(metricType, metricValue);
  return (
    <div className={styles.metric}>
      {icon}
      <Text.Body.Normal className={styles.metricValue}>{value}</Text.Body.Normal>
    </div>
  );
};
