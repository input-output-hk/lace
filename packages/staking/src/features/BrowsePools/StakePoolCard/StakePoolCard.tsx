import { Card, Flex, Text } from '@lace/ui';
import cn from 'classnames';
import { MetricType } from 'features/BrowsePools/types';
import { PoolMetric } from './PoolMetric';
import { StakePoolCardProgressBar } from './SkatePoolCardProgressBar';
import * as styles from './StakePoolCard.css';

export interface StakePoolCardProps {
  title?: string;
  metricType: MetricType;
  metricValue?: string;
  saturation?: string;
  selected?: boolean;
  onClick?: () => void;
}

export const StakePoolCard = ({
  title = '-',
  metricType,
  metricValue,
  saturation,
  selected,
  onClick,
}: StakePoolCardProps) => (
  <Card.Outlined
    className={cn(styles.card, selected && styles.cardSelected)}
    onClick={onClick}
    data-testid="stake-pool-card"
  >
    <Flex flexDirection="column">
      <Flex justifyContent="space-between" w="$fill">
        <Text.Body.Normal weight="$medium" className={styles.title} data-testid="stake-pool-card-title">
          {title}
        </Text.Body.Normal>
        {metricValue && <PoolMetric metricType={metricType} metricValue={metricValue} />}
      </Flex>
      <StakePoolCardProgressBar percentage={saturation} />
    </Flex>
  </Card.Outlined>
);
