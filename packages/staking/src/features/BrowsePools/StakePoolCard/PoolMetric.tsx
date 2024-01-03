import { getNumberWithUnit } from '@lace/common';
import AdaIcon from '../../../assets/icons/ada.svg';
import ChartPieIcon from '../../../assets/icons/chart-pie.svg';
import CubeIcon from '../../../assets/icons/cube.svg';
import { MetricType } from './types';

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
    const { number, unit } = getNumberWithUnit('10234');
    return (
      <span style={{ textAlign: 'right' }}>
        {number}
        {unit}
      </span>
    );
  }

  return metricValue.toString();
};

export const PoolMetric = ({ metricType, metricValue }: Props) => {
  const icon = getIcon(metricType);
  const value = getValue(metricType, metricValue);
  return (
    <div>
      {icon}
      {value}
    </div>
  );
};
