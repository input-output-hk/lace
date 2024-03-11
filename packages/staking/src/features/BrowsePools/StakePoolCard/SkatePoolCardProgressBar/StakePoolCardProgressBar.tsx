/* eslint-disable no-magic-numbers */
import { Flex, Text } from '@lace/ui';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import * as styles from './StakePoolCardProgressBar.css';

interface Props {
  percentage?: string;
}

export const StakePoolCardProgressBar = ({ percentage }: Props) => {
  const { t } = useTranslation();
  const percentageNumber = Number(percentage);
  const progressWidth = Math.min(100, percentageNumber || 0);

  return (
    <Flex alignItems="center" gap="$10" justifyContent="space-between" className={styles.wrapper}>
      <div className={styles.bar} data-testid="stake-pool-card-saturation-bar">
        <div
          className={cn([
            styles.progress,
            {
              [styles.progressMedium]: percentageNumber < 90,
              [styles.progressHigh]: percentageNumber >= 90 && percentageNumber <= 95,
              [styles.progressVeryHigh]: percentageNumber > 95,
            },
          ])}
          style={{ backgroundSize: `${progressWidth}%` }}
        />
      </div>
      <Text.Body.Small weight="$medium" className={styles.progressValue} data-testid="stake-pool-card-saturation-value">
        {!Number.isNaN(percentageNumber) ? `${percentage}%` : t('browsePools.stakePoolGrid.notAvailable')}
      </Text.Body.Small>
    </Flex>
  );
};
