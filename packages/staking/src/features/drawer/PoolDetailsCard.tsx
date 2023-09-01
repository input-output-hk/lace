// eslint-disable-next-line import/no-extraneous-dependencies
import { Cardano } from '@cardano-sdk/core';
import { formatPercentages } from '@lace/common';
import { Box, Card, ControlButton, Flex, PieChartColor, Text } from '@lace/ui';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../outside-handles-provider';
import { Tooltip } from '../overview/staking-info-card/StatsTooltip';
import { useDelegationPortfolioStore } from '../store';
import { PoolCard, PoolHr, PoolIndicator } from './StakePoolPreferences.css';
import TrashIcon from './trash.svg';

interface PoolDetailsCardProps {
  poolId: Cardano.Cip17Pool['id'];
  name: string;
  color: PieChartColor;
}

export const PoolDetailsCard = ({ name, poolId, color }: PoolDetailsCardProps) => {
  const { t } = useTranslation();
  const { draftPortfolioLength, portfolioMutators } = useDelegationPortfolioStore((state) => ({
    draftPortfolioLength: state.draftPortfolio.length,
    portfolioMutators: state.mutators,
  }));
  const { balancesBalance, compactNumber } = useOutsideHandles();
  const balance = compactNumber(balancesBalance?.available?.coinBalance || '0');
  const handleRemovePoolFromPortfolio = () => {
    portfolioMutators.removePoolInManagementProcess({ id: poolId });
  };
  const deleteEnabled = draftPortfolioLength > 1;

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
              draftPortfolioPercentage: formatPercentages(1 / draftPortfolioLength, {
                decimalPlaces: 0,
                rounding: 'down',
              }),
            })}
          </Text.Body.Normal>
        </Flex>
      </Flex>
    </Card.Outlined>
  );
};
