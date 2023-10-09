// eslint-disable-next-line import/no-extraneous-dependencies
import { Box, Card, ControlButton, Flex, PieChartColor, Text } from '@lace/ui';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../outside-handles-provider';
import { Tooltip } from '../overview/staking-info-card/StatsTooltip';
import { PoolCard, PoolHr, PoolIndicator } from './StakePoolPreferences.css';
import TrashIcon from './trash.svg';

interface PoolDetailsCardProps {
  name: string;
  color: PieChartColor;
  weight: number;
  onRemove?: () => void;
}

export const PoolDetailsCard = ({ name, color, weight, onRemove }: PoolDetailsCardProps) => {
  const { t } = useTranslation();
  const { compactNumber, balancesBalance } = useOutsideHandles();
  const stakeValue = balancesBalance
    ? // eslint-disable-next-line no-magic-numbers
      compactNumber((weight / 100) * Number(balancesBalance.available.coinBalance))
    : '-';

  return (
    <Card.Outlined className={PoolCard}>
      <Flex flexDirection="column" alignItems="stretch" gap="$16">
        <Flex justifyContent="space-between" alignItems="center">
          <Flex alignItems="center" gap="$32">
            <Box className={PoolIndicator} style={{ backgroundColor: color }} />
            <Text.SubHeading>{name}</Text.SubHeading>
          </Flex>
          <Tooltip content={onRemove ? undefined : t('drawer.preferences.pickMorePools')}>
            <div>
              <ControlButton.Icon icon={<TrashIcon />} onClick={onRemove} disabled={!onRemove} />
            </div>
          </Tooltip>
        </Flex>
        <Box className={PoolHr} />
        <Flex justifyContent="space-between" alignItems="center">
          <Text.Body.Normal weight="$semibold">
            {t('drawer.preferences.stakeValue', {
              stakePercentage: weight,
              stakeValue,
            })}
          </Text.Body.Normal>
        </Flex>
      </Flex>
    </Card.Outlined>
  );
};
