/* eslint-disable unicorn/consistent-destructuring */
import { Wallet } from '@lace/cardano';
import { ControlButton, Flex, PIE_CHART_DEFAULT_COLOR_SET, PieChartColor, Text } from '@lace/ui';
import { useTranslation } from 'react-i18next';
import { DelegationCard, DelegationStatus } from '../../delegation-card';
import { useOutsideHandles } from '../../outside-handles-provider';
import {
  DelegationPortfolioStore,
  MAX_POOLS_COUNT,
  PERCENTAGE_SCALE_MAX,
  useDelegationPortfolioStore,
} from '../../store';
import { PoolDetailsCard } from './PoolDetailsCard';

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

export const StepPreferencesContent = () => {
  const { t } = useTranslation();
  const {
    balancesBalance,
    walletStoreWalletUICardanoCoin: { symbol },
    compactNumber,
  } = useOutsideHandles();
  const { draftPortfolio, portfolioMutators, delegationStatus, cardanoCoinSymbol } = useDelegationPortfolioStore(
    (state) => ({
      cardanoCoinSymbol: state.cardanoCoinSymbol,
      delegationStatus: getDraftDelegationStatus(state),
      draftPortfolio: state.draftPortfolio || [],
      portfolioMutators: state.mutators,
    })
  );

  const displayData = draftPortfolio.map((draftPool, i) => {
    const {
      displayData: { name },
      id,
      sliderIntegerPercentage,
    } = draftPool;

    return {
      cardanoCoinSymbol,
      color: PIE_CHART_DEFAULT_COLOR_SET[i] as PieChartColor,
      id,
      name: name || '-',
      onChainPercentage: draftPool.basedOnCurrentPortfolio ? draftPool.onChainPercentage : undefined,
      percentage: sliderIntegerPercentage,
      savedIntegerPercentage: draftPool.basedOnCurrentPortfolio ? draftPool.savedIntegerPercentage : undefined,
      // TODO
      sliderIntegerPercentage,
      stakeValue: balancesBalance
        ? compactNumber(
            (sliderIntegerPercentage / PERCENTAGE_SCALE_MAX) * Number(balancesBalance.available.coinBalance)
          )
        : '-',
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
        {displayData.map(
          ({ color, id, name, stakeValue, onChainPercentage, savedIntegerPercentage, sliderIntegerPercentage }) => (
            <PoolDetailsCard
              key={id}
              color={color}
              name={name}
              onRemove={draftPortfolio.length > 1 ? createRemovePoolFromPortfolio(id) : undefined}
              actualPercentage={onChainPercentage}
              savedPercentage={savedIntegerPercentage}
              targetPercentage={sliderIntegerPercentage}
              stakeValue={stakeValue}
              cardanoCoinSymbol={cardanoCoinSymbol}
              expanded
              onExpandButtonClick={() => void 0}
              onPercentageChange={(value) => {
                console.info(value);
                portfolioMutators.executeCommand({
                  data: { id, newSliderPercentage: value },
                  type: 'UpdateStakePercentage',
                });
              }}
            />
          )
        )}
      </Flex>
    </Flex>
  );
};
