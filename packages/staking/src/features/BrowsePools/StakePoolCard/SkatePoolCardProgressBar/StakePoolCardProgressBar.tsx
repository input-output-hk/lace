/* eslint-disable no-magic-numbers */
import * as styles from './StakePoolCardProgressBar.css';

interface Props {
  percentage: number;
}

const getProgressColor = (percentage: number): string => {
  if (percentage <= 20) {
    return '#3489F7'; // blue
  } else if (percentage <= 69) {
    return '#2CB67D'; // green
  } else if (percentage <= 90) {
    return '#FDC300'; // yellow
  } else if (percentage < 100) {
    return '#FF8E3C'; // orange
  }
  return '#FF5470';
};

export const StakePoolCardProgressBar = ({ percentage }: Props) => {
  const progressColor = getProgressColor(percentage);
  const progressWidth = percentage > 100 ? 100 : percentage;

  return (
    <div className={styles.wrapper}>
      <div className={styles.bar}>
        <div className={styles.progress} style={{ backgroundColor: progressColor, width: `${progressWidth}%` }} />
      </div>
      <div className={styles.progressValue}>{percentage.toFixed(0)}%</div>
    </div>
  );
};
