/* eslint-disable no-magic-numbers */
import { Flex, Text } from '@lace/ui';
import cn from 'classnames';
import inRange from 'lodash/inRange';
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
              [styles.progressLow]: inRange(percentage, 0, 21),
              [styles.progressMedium]: inRange(percentage, 21, 70),
              [styles.progressHigh]: inRange(percentage, 70, 90),
              [styles.progressVeryHigh]: inRange(percentage, 90, 100) || percentage === 100,
              [styles.progressOversaturated]: percentage > 100,
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
