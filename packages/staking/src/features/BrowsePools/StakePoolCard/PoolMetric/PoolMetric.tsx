import { getNumberWithUnit } from '@lace/common';
import AdaIcon from '/src/assets/icons/ada.svg';
import ChartPieIcon from '/src/assets/icons/chart-pie.svg';
import CubeIcon from '/src/assets/icons/cube.svg';
import { Text } from '@lace/ui';
import { MetricType } from '../types';
import * as styles from './PoolMetric.css';

interface Props {
  metricType: MetricType;
  metricValue: number;
}

const getIcon = (metricType: MetricType) => {
  if (
    metricType === 'saturation' ||
    metricType === 'cost' ||
    metricType === 'pledge' ||
    metricType === 'stake-delegeted'
  ) {
    return <AdaIcon width={14} height={14} />;
  }
  if (metricType === 'margin') {
    return <ChartPieIcon width={15} height={14} />;
  }
  if (metricType === 'blocks') {
    return <CubeIcon width={17} height={16} />;
  }
  return null;
};

const getValue = (metricType: MetricType, metricValue: number) => {
  if (metricType === 'stake-delegeted' || metricType === 'pledge' || metricType === 'blocks') {
    const { number, unit } = getNumberWithUnit(metricValue.toString());
    return `${number}${unit}`;
  }

  return metricValue.toString();
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
