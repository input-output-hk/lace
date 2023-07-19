// eslint-disable-next-line import/no-extraneous-dependencies
import { Cardano } from '@cardano-sdk/core';
import { Box, Card, ColorValueHex, ControlButton, Flex, Text } from '@lace/ui';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../outside-handles-provider';
import { useDelegationPortfolioStore } from '../store';
import { PoolCard, PoolHr, PoolIndicator } from './StakePoolPreferences.css';
import TrashIcon from './trash.svg';

interface PoolDetailsCardProps {
  poolId: Cardano.Cip17Pool['id'];
  name: string;
  index: number;
  draftPortfolioLength: number;
  colorSet: ColorValueHex[];
}

export const PoolDetailsCard = ({ name, index, poolId, draftPortfolioLength, colorSet }: PoolDetailsCardProps) => {
  const { t } = useTranslation();
  const removePoolFromDraft = useDelegationPortfolioStore((state) => state.mutators.removePoolFromDraft);
  const { balancesBalance, compactNumber } = useOutsideHandles();
  const balance = compactNumber(balancesBalance.available.coinBalance);
  const handleRemovePoolFromPortfolio = () => {
    removePoolFromDraft({ id: poolId });
  };

  return (
    <Card.Outlined className={PoolCard}>
      <Flex flexDirection={'column'} alignItems={'stretch'} gap={'$16'}>
        <Flex justifyContent={'space-between'} alignItems={'center'}>
          <Flex alignItems={'center'} gap={'$32'}>
            <Box className={PoolIndicator} style={{ backgroundColor: colorSet[index] }} />
            <Text.SubHeading>{name}</Text.SubHeading>
          </Flex>
          <ControlButton.Icon icon={<TrashIcon />} onClick={handleRemovePoolFromPortfolio} />
        </Flex>
        <Box className={PoolHr} />
        <Flex justifyContent={'space-between'} alignItems={'center'}>
          <Text.Body.Normal weight="$semibold">
            {t('drawer.preferences.partOfBalance', { balance, draftPortfolioLength })}
          </Text.Body.Normal>
        </Flex>
      </Flex>
    </Card.Outlined>
  );
};
