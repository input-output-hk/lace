/* eslint-disable no-magic-numbers */
import { Flex, Text } from '@lace/ui';
import cn from 'classnames';
import * as styles from './StakePoolCardProgressBar.css';

interface Props {
  percentage: string;
}

export const StakePoolCardProgressBar = ({ percentage }: Props) => {
  const percentageNumber = Number(percentage);
  const progressWidth = Math.min(100, percentageNumber);

  return (
    <Flex alignItems="center" gap="$10" justifyContent="space-between" className={styles.wrapper}>
      <div className={styles.bar}>
        <div
          className={cn([
            styles.progress,
            {
              [styles.progressMedium]: percentageNumber < 90,
              [styles.progressHigh]: percentageNumber >= 90 && percentageNumber <= 95,
              [styles.progressVeryHigh]: percentageNumber > 95,
            },
          ])}
          style={{ width: `${progressWidth}%` }}
        />
      </div>
      <Text.Body.Small weight="$medium" className={styles.progressValue}>
        {percentage}%
      </Text.Body.Small>
    </Flex>
  );
};
