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
    <Flex alignItems="center" gap="$10" justifyContent="space-between">
      <div className={styles.bar}>
        <div
          className={cn([
            styles.progress,
            {
              [styles.progress20]: inRange(percentage, 0, 21),
              [styles.progress69]: inRange(percentage, 21, 70),
              [styles.progress100]: inRange(percentage, 70, 100) || percentage === 100,
              [styles.progressOversaturated]: percentage > 100,
            },
          ])}
          style={{ width: `${progressWidth}%` }}
        />
      </div>
      <Text.Body.Normal weight="$semibold" className={styles.progressValue}>
        {percentage.toFixed(0)}%
      </Text.Body.Normal>
    </Flex>
  );
};
