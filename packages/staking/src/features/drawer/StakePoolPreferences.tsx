/* eslint-disable unicorn/consistent-destructuring */
import { Wallet } from '@lace/cardano';
import { Button, ControlButton, Flex, PIE_CHART_DEFAULT_COLOR_SET, PieChartColor, Text } from '@lace/ui';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../outside-handles-provider';
import { DelegationCard, DelegationStatus } from '../overview';
import { DelegationPortfolioStore, MAX_POOLS_COUNT, PERCENTAGE_SCALE_MAX, useDelegationPortfolioStore } from '../store';
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

const getDraftDelegationStatus = ({ draftPortfolio }: DelegationPortfolioStore): DelegationStatus => {
  if (!draftPortfolio || draftPortfolio.length === 0) return 'no-selection';

  const percentageSum = draftPortfolio?.reduce((acc, pool) => acc + pool.sliderIntegerPercentage, 0);
  if (percentageSum > PERCENTAGE_SCALE_MAX) return 'over-allocated';
  if (percentageSum < PERCENTAGE_SCALE_MAX) return 'under-allocated';

  if (draftPortfolio.length === 1) {
    return 'simple-delegation';
  }
  if (draftPortfolio.length > 1) {
    return 'multi-delegation';
  }

  throw new Error('Unexpected delegation status');
};

// eslint-disable-next-line react/no-multi-comp
export const StakePoolPreferences = () => {
  const { t } = useTranslation();
  const {
    balancesBalance,
    walletStoreWalletUICardanoCoin: { symbol },
    compactNumber,
  } = useOutsideHandles();
  const { draftPortfolio, portfolioMutators, delegationStatus } = useDelegationPortfolioStore((state) => ({
    activeDrawerStep: state.activeDrawerStep,
    delegationStatus: getDraftDelegationStatus(state),
    draftPortfolio: state.draftPortfolio || [],
    portfolioMutators: state.mutators,
  }));

  const displayData = draftPortfolio.map((draftPool, i) => {
    const {
      displayData: { name },
      id,
      sliderIntegerPercentage,
    } = draftPool;
    return {
      color: PIE_CHART_DEFAULT_COLOR_SET[i] as PieChartColor,
      id,
      name: name || '-',
      percentage: sliderIntegerPercentage,
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
        status={delegationStatus}
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
