import { Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import { Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import InfoIcon from '../../../../assets/icons/info-icon.svg';
import * as styles from './PoolDetailsCardData.css';

interface PoolDetailsCardProps {
  actualPercentage?: number;
  savedPercentage?: number | null;
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
          <Text.Body.Large
            weight="$medium"
            className={styles.valueLabel}
            data-testid="pool-details-card-saved-ratio-title"
          >
            {t('drawer.preferences.poolDetails.savedRatio')}
          </Text.Body.Large>
          <Tooltip placement="top" title={t('drawer.preferences.poolDetails.savedRatioTooltip')}>
            <InfoIcon className={styles.valueInfoIcon} data-testid="pool-details-card-saved-ratio-tooltip" />
          </Tooltip>
        </Flex>
        <Text.Body.Large weight="$semibold" data-testid="pool-details-card-saved-ratio-value">
          {savedPercentage || '-'} {!!savedPercentage && <Text.Body.Small weight="$medium">%</Text.Body.Small>}
        </Text.Body.Large>
      </Flex>
      <Flex pl="$32" pr="$32" flexDirection="column" className={styles.valueBox}>
        <Flex alignItems="center" mb="$6">
          <Text.Body.Large
            weight="$medium"
            className={styles.valueLabel}
            data-testid="pool-details-card-actual-ratio-title"
          >
            {t('drawer.preferences.poolDetails.actualRatio')}
          </Text.Body.Large>
          <Tooltip placement="top" title={t('drawer.preferences.poolDetails.actualRatioTooltip')}>
            <InfoIcon className={styles.valueInfoIcon} data-testid="pool-details-card-actual-ratio-tooltip" />
          </Tooltip>
        </Flex>
        <Text.Body.Large weight="$semibold" data-testid="pool-details-card-actual-ratio-value">
          {actualPercentage || '-'} {actualPercentage && <Text.Body.Small weight="$medium">%</Text.Body.Small>}
        </Text.Body.Large>
      </Flex>
      <Flex pl="$32" pr="$32" flexDirection="column" className={styles.valueBox}>
        <Flex alignItems="center" mb="$6">
          <Text.Body.Large
            weight="$medium"
            className={styles.valueLabel}
            data-testid="pool-details-card-actual-stake-title"
          >
            {t('drawer.preferences.poolDetails.actualStake')}
          </Text.Body.Large>
          <Tooltip placement="top" title={t('drawer.preferences.poolDetails.actualStakeTooltip')}>
            <InfoIcon className={styles.valueInfoIcon} data-testid="pool-details-card-actual-stake-tooltip" />
          </Tooltip>
        </Flex>
        <Text.Body.Large weight="$semibold" data-testid="pool-details-card-actual-stake-value">
          {stakeValue}{' '}
          <Text.Body.Small weight="$medium" data-testid="pool-details-card-actual-stake-coin-symbol">
            {cardanoCoinSymbol}
          </Text.Body.Small>
        </Text.Body.Large>
      </Flex>
    </Flex>
  );
};
