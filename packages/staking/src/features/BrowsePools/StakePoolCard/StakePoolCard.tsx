import { Card, Flex, Text } from '@lace/ui';
import cn from 'classnames';
import { PoolMetric } from './PoolMetric';
import { StakePoolCardProgressBar } from './SkatePoolCardProgressBar';
import * as styles from './StakePoolCard.css';
import { MetricType } from './types';

export interface StakePoolCardProps {
  title: string;
  metricType: MetricType;
  metricValue: number;
  saturation: number;
  selected?: boolean;
  onClick: () => void;
}

export const StakePoolCard = ({
  title,
  metricType,
  metricValue,
  saturation,
  selected,
  onClick,
}: StakePoolCardProps) => (
  <Card.Outlined className={cn(styles.card, selected && styles.cardSelected)} onClick={onClick}>
    <Flex justifyContent="space-between">
      <Text.Body.Large className={styles.tickerName}>{title}</Text.Body.Large>
      <PoolMetric metricType={metricType} metricValue={metricValue} />
    </Flex>
    <StakePoolCardProgressBar percentage={saturation} />
  </Card.Outlined>
);
