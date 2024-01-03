import { Card } from '@lace/ui';
import { PoolMetric } from './PoolMetric';
import { StakePoolCardProgressBar } from './SkatePoolCardProgressBar';
import * as styles from './StakePoolCard.css';
import { MetricType } from './types';

interface Props {
  ticker: string;
  metricType: MetricType;
  metricValue: number;
  saturation: number;
  onClick: () => void;
}

export const StakePoolCard = ({ ticker, metricType, metricValue, saturation, onClick }: Props) => {
  console.debug('[STAKE]:', { metricType, metricValue, onClick, saturation, ticker });

  return (
    <Card.Outlined className={styles.card}>
      <div className={styles.firstRow}>
        <div className={styles.tickerName}>{ticker}</div>
        <div>
          <PoolMetric metricType={metricType} metricValue={metricValue} />
        </div>
      </div>
      <div style={{ display: 'flex' }}>
        <StakePoolCardProgressBar percentage={saturation} />
      </div>
    </Card.Outlined>
  );
};
