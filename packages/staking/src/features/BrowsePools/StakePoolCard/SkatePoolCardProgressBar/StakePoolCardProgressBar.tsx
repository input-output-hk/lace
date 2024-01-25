/* eslint-disable no-magic-numbers */
import { Flex, Text } from '@lace/ui';
import cn from 'classnames';
import inRange from 'lodash/inRange';
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
              [styles.progressLow]: inRange(percentageNumber, 0, 21),
              [styles.progressMedium]: inRange(percentageNumber, 21, 70),
              [styles.progressHigh]: inRange(percentageNumber, 70, 90),
              [styles.progressVeryHigh]: inRange(percentageNumber, 90, 100) || percentageNumber === 100,
              [styles.progressOversaturated]: percentageNumber > 100,
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
