import { Flex, Text } from '@lace/ui';
import AdaIcon from 'assets/icons/ada.svg';
import ChartPieIcon from 'assets/icons/chart-pie.svg';
import CubeIcon from 'assets/icons/cube.svg';
import { MetricType } from 'features/BrowsePools/StakePoolsTable';
import * as styles from './PoolMetric.css';

interface Props {
  metricType: MetricType;
  metricValue: string;
}

const iconsByType: Partial<Record<MetricType, React.ReactNode>> = {
  blocks: <CubeIcon className={styles.icon} />,
  cost: <AdaIcon className={styles.icon} />,
  liveStake: <Text.Body.Normal weight="$semibold">LS</Text.Body.Normal>,
  margin: <ChartPieIcon className={styles.icon} />,
  pledge: <AdaIcon className={styles.icon} />,
};

export const PoolMetric = ({ metricType, metricValue }: Props) => (
  <Flex alignItems="center" gap="$4" className={styles.metric}>
    {iconsByType[metricType]}
    <Text.Body.Small weight="$medium">{metricValue}</Text.Body.Small>
  </Flex>
);
