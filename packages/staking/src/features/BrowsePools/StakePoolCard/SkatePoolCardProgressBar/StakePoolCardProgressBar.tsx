import { Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import { useTranslation } from 'react-i18next';
import { getSaturationLevel } from '../../utils';
import * as styles from './StakePoolCardProgressBar.css';

interface Props {
  percentage?: string | number;
  dataTestId?: string;
}

const maxPercentages = 100;

export const StakePoolCardProgressBar = ({ percentage, dataTestId }: Props) => {
  const { t } = useTranslation();
  const percentageNumber = Number(percentage);
  const progressWidth = Math.min(maxPercentages, percentageNumber || 0);
  const saturationLevel = getSaturationLevel(percentageNumber);

  return (
    <Flex
      data-testid={dataTestId}
      alignItems="center"
      gap="$10"
      justifyContent="space-between"
      className={styles.wrapper}
    >
      <div className={styles.bar} data-testid="stake-pool-card-saturation-bar">
        <div className={styles.progress({ level: saturationLevel })} style={{ backgroundSize: `${progressWidth}%` }} />
      </div>
      <Text.Body.Small weight="$medium" className={styles.progressValue} data-testid="saturation-value">
        {!Number.isNaN(percentageNumber) ? `${percentage}%` : t('browsePools.stakePoolGrid.notAvailable')}
      </Text.Body.Small>
    </Flex>
  );
};
