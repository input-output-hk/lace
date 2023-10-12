import { Flex, Text } from '@lace/ui';
import { Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import InfoIcon from '../../../../assets/icons/info-icon.svg';
import * as styles from './PoolDetailsCardData.css';

interface PoolDetailsCardProps {
  actualPercentage?: number;
  savedPercentage?: number;
  stakeValue: string;
  cardanoCoinSymbol: string;
}

export const PoolDetailsCardData = ({
  actualPercentage,
  savedPercentage,
  stakeValue,
  cardanoCoinSymbol,
}: PoolDetailsCardProps) => {
  const { t } = useTranslation();

  return (
    <Flex className={styles.root}>
      <Flex pl="$32" pr="$32" flexDirection="column" className={styles.valueBox}>
        <Flex alignItems="center" mb="$6">
          <Text.Body.Large weight="$medium" className={styles.valueLabel}>
            {t('drawer.preferences.poolDetails.savedRatio')}
          </Text.Body.Large>
          <Tooltip placement="top" title={t('drawer.preferences.poolDetails.savedRatioTooltip')}>
            <InfoIcon className={styles.valueInfoIcon} />
          </Tooltip>
        </Flex>
        <Text.Body.Large weight="$semibold">
          {savedPercentage || '-'} {savedPercentage && <Text.Body.Small weight="$medium">%</Text.Body.Small>}
        </Text.Body.Large>
      </Flex>
      <Flex pl="$32" pr="$32" flexDirection="column" className={styles.valueBox}>
        <Flex alignItems="center" mb="$6">
          <Text.Body.Large weight="$medium" className={styles.valueLabel}>
            {t('drawer.preferences.poolDetails.actualRatio')}
          </Text.Body.Large>
          <Tooltip placement="top" title={t('drawer.preferences.poolDetails.actualRatioTooltip')}>
            <InfoIcon className={styles.valueInfoIcon} />
          </Tooltip>
        </Flex>
        <Text.Body.Large weight="$semibold">
          {actualPercentage || '-'} {actualPercentage && <Text.Body.Small weight="$medium">%</Text.Body.Small>}
        </Text.Body.Large>
      </Flex>
      <Flex pl="$32" pr="$32" flexDirection="column" className={styles.valueBox}>
        <Flex alignItems="center" mb="$6">
          <Text.Body.Large weight="$medium" className={styles.valueLabel}>
            {t('drawer.preferences.poolDetails.actualStake')}
          </Text.Body.Large>
          <Tooltip placement="top" title={t('drawer.preferences.poolDetails.actualStakeTooltip')}>
            <InfoIcon className={styles.valueInfoIcon} />
          </Tooltip>
        </Flex>
        <Text.Body.Large weight="$semibold">
          {stakeValue} <Text.Body.Small weight="$medium">{cardanoCoinSymbol}</Text.Body.Small>
        </Text.Body.Large>
      </Flex>
    </Flex>
  );
};
