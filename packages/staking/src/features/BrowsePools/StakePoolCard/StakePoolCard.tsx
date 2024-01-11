import { Card, Flex, Text } from '@lace/ui';
import cn from 'classnames';
import { PoolMetric } from './PoolMetric';
import { StakePoolCardProgressBar } from './SkatePoolCardProgressBar';
import * as styles from './StakePoolCard.css';
import { MetricType } from './types';

export interface StakePoolCardProps {
  title?: string;
  metricType: MetricType;
  metricValue?: number;
  saturation: number;
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
  <Card.Outlined className={cn(styles.card, selected && styles.cardSelected)} {...(onClick ? { onClick } : {})}>
    <Flex flexDirection="column">
      <Flex justifyContent="space-between" w="$fill">
        <Text.Body.Normal weight="$medium" className={styles.title}>
          {title}
        </Text.Body.Normal>
        <PoolMetric metricType={metricType} metricValue={metricValue} />
      </Flex>
      <StakePoolCardProgressBar percentage={saturation} />
    </Flex>
  </Card.Outlined>
);
