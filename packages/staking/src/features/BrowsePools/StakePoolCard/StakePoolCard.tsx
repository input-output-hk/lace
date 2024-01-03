import { Card, Text } from '@lace/ui';
import cn from 'classnames';
import { PoolMetric } from './PoolMetric';
import { StakePoolCardProgressBar } from './SkatePoolCardProgressBar';
import * as styles from './StakePoolCard.css';
import { MetricType } from './types';

export interface StakePoolCardProps {
  ticker: string;
  metricType: MetricType;
  metricValue: number;
  saturation: number;
  selected?: boolean;
  onClick: () => void;
}

export const StakePoolCard = ({
  ticker,
  metricType,
  metricValue,
  saturation,
  selected,
  onClick,
}: StakePoolCardProps) => {
  console.debug('[STAKE]:', { metricType, metricValue, onClick, saturation, ticker });

  return (
    <Card.Outlined className={cn(styles.card, selected && styles.cardSelected)}>
      <div className={styles.firstRow}>
        <Text.Body.Large className={styles.tickerName}>{ticker}</Text.Body.Large>
        <PoolMetric metricType={metricType} metricValue={metricValue} />
      </div>
      <StakePoolCardProgressBar percentage={saturation} />
    </Card.Outlined>
  );
};
