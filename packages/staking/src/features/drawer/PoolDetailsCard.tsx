// eslint-disable-next-line import/no-extraneous-dependencies
import { Cardano } from '@cardano-sdk/core';
import { formatPercentages } from '@lace/common';
import { Box, Card, ColorValueHex, ControlButton, Flex, Text } from '@lace/ui';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../outside-handles-provider';
import { Tooltip } from '../overview/staking-info-card/StatsTooltip';
import { useDelegationPortfolioStore } from '../store';
import { PoolCard, PoolHr, PoolIndicator } from './StakePoolPreferences.css';
import TrashIcon from './trash.svg';

interface PoolDetailsCardProps {
  poolId: Cardano.Cip17Pool['id'];
  name: string;
  draftPortfolioLength: number;
  color: ColorValueHex;
  deleteEnabled: boolean;
}

export const PoolDetailsCard = ({ name, poolId, draftPortfolioLength, color, deleteEnabled }: PoolDetailsCardProps) => {
  const { t } = useTranslation();
  const removePoolFromDraft = useDelegationPortfolioStore((state) => state.mutators.removePoolFromDraft);
  const { balancesBalance, compactNumber } = useOutsideHandles();
  const balance = compactNumber(balancesBalance.available.coinBalance);
  const handleRemovePoolFromPortfolio = () => {
    removePoolFromDraft({ id: poolId });
  };

  return (
    <Card.Outlined className={PoolCard}>
      <Flex flexDirection="column" alignItems="stretch" gap="$16">
        <Flex justifyContent="space-between" alignItems="center">
          <Flex alignItems="center" gap="$32">
            <Box className={PoolIndicator} style={{ backgroundColor: color }} />
            <Text.SubHeading>{name}</Text.SubHeading>
          </Flex>
          <Tooltip content={deleteEnabled ? undefined : t('drawer.preferences.pickMorePools')}>
            <div>
              <ControlButton.Icon
                icon={<TrashIcon />}
                onClick={handleRemovePoolFromPortfolio}
                disabled={!deleteEnabled}
              />
            </div>
          </Tooltip>
        </Flex>
        <Box className={PoolHr} />
        <Flex justifyContent="space-between" alignItems="center">
          <Text.Body.Normal weight="$semibold">
            {t('drawer.preferences.percentageOfBalance', {
              balance,
              draftPortfolioPercentage: formatPercentages(1 / draftPortfolioLength, 0),
            })}
          </Text.Body.Normal>
        </Flex>
      </Flex>
    </Card.Outlined>
  );
};
