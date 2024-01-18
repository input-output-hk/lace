import { Flex, Text } from '@lace/ui';
import AdaIcon from 'assets/icons/ada.svg';
import ChartPieIcon from 'assets/icons/chart-pie.svg';
import CubeIcon from 'assets/icons/cube.svg';
import { MetricType } from '../types';
import * as styles from './PoolMetric.css';

interface Props {
  metricType: MetricType;
  metricValue: string;
}

const iconsByType: Record<MetricType, React.ReactNode> = {
  blocks: <CubeIcon className={styles.icon} />,
  cost: <AdaIcon className={styles.icon} />,
  liveStake: <Text.Body.Normal weight="$semibold">LS</Text.Body.Normal>,
  margin: <ChartPieIcon className={styles.icon} />,
  pledge: <AdaIcon className={styles.icon} />,
  ros: null,
  saturation: null,
  ticker: null,
};

export const PoolMetric = ({ metricType, metricValue }: Props) => {
  const icon = iconsByType[metricType];
  return (
    <Flex alignItems="center" gap="$4" className={styles.metric}>
      {icon}
      <Text.Body.Small weight="$medium">{metricValue}</Text.Body.Small>
    </Flex>
  );
};
