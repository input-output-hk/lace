/* eslint-disable unicorn/consistent-destructuring */
import { Wallet } from '@lace/cardano';
import { Button, ControlButton, Flex, PIE_CHART_DEFAULT_COLOR_SET, PieChartColor, Text } from '@lace/ui';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../outside-handles-provider';
import { DelegationCard } from '../overview/DelegationCard';
import { MAX_POOLS_COUNT, useDelegationPortfolioStore } from '../store';
import { PoolDetailsCard } from './PoolDetailsCard';

type StakePoolPreferencesFooterProps = {
  buttonTitle: string;
};

export const StakePoolPreferencesFooter = ({ buttonTitle }: StakePoolPreferencesFooterProps) => {
  const portfolioMutators = useDelegationPortfolioStore((state) => state.mutators);
  return (
    <Flex flexDirection="column" alignItems="stretch" gap="$16">
      <Button.CallToAction
        label={buttonTitle}
        data-testid="preferences-next-button"
        onClick={() =>
          portfolioMutators.executeCommand({
            type: 'DrawerContinue',
          })
        }
        w="$fill"
      />
    </Flex>
  );
};

// eslint-disable-next-line react/no-multi-comp
export const StakePoolPreferences = () => {
  const { t } = useTranslation();
  const {
    balancesBalance,
    walletStoreWalletUICardanoCoin: { symbol },
    compactNumber,
  } = useOutsideHandles();
  const { draftPortfolio, portfolioMutators } = useDelegationPortfolioStore((state) => ({
    activeDrawerStep: state.activeDrawerStep,
    draftPortfolio: state.draftPortfolio || [],
    portfolioMutators: state.mutators,
  }));

  const targetWeightsSum = draftPortfolio.map(({ targetWeight }) => targetWeight).reduce((a, b) => a + b, 0);
  const displayData = draftPortfolio.map((draftPool, i) => {
    const {
      displayData: { name },
      id,
      targetWeight,
    } = draftPool;
    return {
      color: PIE_CHART_DEFAULT_COLOR_SET[i] as PieChartColor,
      id,
      name: name || '-',
      percentage: draftPool.basedOnCurrentPortfolio
        ? draftPool.currentPortfolioPercentage
        : targetWeight / targetWeightsSum,
    };
  });
  const createRemovePoolFromPortfolio = (poolId: Wallet.Cardano.PoolIdHex) => () => {
    portfolioMutators.executeCommand({
      data: poolId,
      type: 'RemoveStakePool',
    });
  };
  const addPoolButtonDisabled = draftPortfolio.length === MAX_POOLS_COUNT;
  const onAddPoolButtonClick = () => {
    portfolioMutators.executeCommand({
      type: 'AddStakePools',
    });
  };

  return (
    <Flex flexDirection="column" gap="$32" alignItems="stretch">
      <DelegationCard
        balance={compactNumber(balancesBalance?.available?.coinBalance || '0')}
        cardanoCoinSymbol={symbol}
        distribution={displayData}
        status="ready"
        showDistribution
      />
      <Flex justifyContent="space-between">
        <Text.Body.Large weight="$semibold">
          {t('drawer.preferences.selectedStakePools', { count: draftPortfolio.length })}
        </Text.Body.Large>
        <ControlButton.Small
          label={t('drawer.preferences.addPoolButton')}
          onClick={onAddPoolButtonClick}
          disabled={addPoolButtonDisabled}
        />
      </Flex>
      <Flex flexDirection="column" gap="$16" pb="$32" alignItems="stretch">
        {displayData.map(({ name, id, color, percentage }) => (
          <PoolDetailsCard
            key={id}
            name={name}
            color={color}
            percentage={percentage}
            onRemove={draftPortfolio.length > 1 ? createRemovePoolFromPortfolio(id) : undefined}
          />
        ))}
      </Flex>
    </Flex>
  );
};
