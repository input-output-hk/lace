/* eslint-disable no-magic-numbers */
import { Flex, Text } from '@lace/ui';
import cn from 'classnames';
import * as styles from './StakePoolCardProgressBar.css';

interface Props {
  percentage: number;
}

export const StakePoolCardProgressBar = ({ percentage }: Props) => {
  const progressWidth = percentage > 100 ? 100 : percentage;

  return (
    <Flex alignItems="center" gap="$10" justifyContent="space-between" className={styles.wrapper}>
      <div className={styles.bar}>
        <div
          className={cn([
            styles.progress,
            {
              [styles.progressMedium]: percentage < 90,
              [styles.progressHigh]: percentage >= 90 && percentage <= 95,
              [styles.progressVeryHigh]: percentage > 95,
            },
          ])}
          style={{ width: `${progressWidth}%` }}
        />
      </div>
      <Text.Body.Small weight="$medium" className={styles.progressValue}>
        {percentage.toFixed(2)}%
      </Text.Body.Small>
    </Flex>
  );
};
