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
  [MetricType.blocks]: <CubeIcon className={styles.icon} data-testid="stake-pool-metric-icon-blocks" />,
  [MetricType.cost]: <AdaIcon className={styles.icon} data-testid="stake-pool-metric-icon-blocks" />,
  [MetricType.liveStake]: (
    <Text.Body.Normal weight="$semibold" data-testid="stake-pool-metric-icon-live-stake">
      LS
    </Text.Body.Normal>
  ),
  [MetricType.margin]: <ChartPieIcon className={styles.icon} data-testid="stake-pool-metric-icon-margin" />,
  [MetricType.pledge]: <AdaIcon className={styles.icon} data-testid="stake-pool-metric-icon-pledge" />,
  [MetricType.ticker]: null,
  [MetricType.saturation]: null,
  [MetricType.apy]: null,
};

export const PoolMetric = ({ metricType, metricValue }: Props) => (
  <Flex alignItems="center" gap="$4" className={styles.metric} data-testid="stake-pool-metric">
    {iconsByType[metricType]}
    <Text.Body.Small weight="$medium" data-testid="stake-pool-metric-value">
      {metricValue}
    </Text.Body.Small>
  </Flex>
);
