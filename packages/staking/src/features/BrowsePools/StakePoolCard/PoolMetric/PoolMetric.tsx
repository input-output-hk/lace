import { Flex, Text } from '@lace/ui';
import AdaIcon from 'assets/icons/ada.svg';
import ChartPieIcon from 'assets/icons/chart-pie.svg';
import CubeIcon from 'assets/icons/cube.svg';
import { MetricType } from 'features/BrowsePools/types';
import * as styles from './PoolMetric.css';

interface Props {
  metricType: MetricType;
  metricValue: string;
}

const iconsByType: Record<MetricType, React.ReactNode> = {
  [MetricType.blocks]: <CubeIcon className={styles.icon} />,
  [MetricType.cost]: <AdaIcon className={styles.icon} />,
  [MetricType.liveStake]: <Text.Body.Normal weight="$semibold">LS</Text.Body.Normal>,
  [MetricType.margin]: <ChartPieIcon className={styles.icon} />,
  [MetricType.pledge]: <AdaIcon className={styles.icon} />,
  [MetricType.ticker]: null,
  [MetricType.saturation]: null,
  [MetricType.apy]: null,
};

export const PoolMetric = ({ metricType, metricValue }: Props) => (
  <Flex alignItems="center" gap="$4" className={styles.metric}>
    {iconsByType[metricType]}
    <Text.Body.Small weight="$medium">{metricValue}</Text.Body.Small>
  </Flex>
);
