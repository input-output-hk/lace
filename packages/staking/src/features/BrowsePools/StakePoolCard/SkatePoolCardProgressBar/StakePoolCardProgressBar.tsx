/* eslint-disable no-magic-numbers */
import { Text } from '@lace/ui';
import * as styles from './StakePoolCardProgressBar.css';
import { getProgressColor } from './utils';

interface Props {
  percentage: number;
}

export const StakePoolCardProgressBar = ({ percentage }: Props) => {
  const progressColor = getProgressColor(percentage);
  const progressWidth = percentage > 100 ? 100 : percentage;

  return (
    <div className={styles.wrapper}>
      <div className={styles.bar}>
        <div className={styles.progress} style={{ backgroundColor: progressColor, width: `${progressWidth}%` }} />
      </div>
      <Text.Body.Normal className={styles.progressValue}>{percentage.toFixed(0)}%</Text.Body.Normal>
    </div>
  );
};
