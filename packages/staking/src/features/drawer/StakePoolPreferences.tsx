import { Button, ControlButton, Flex, PIE_CHART_DEFAULT_COLOR_SET, PieChartColor, Text } from '@lace/ui';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../outside-handles-provider';
import { DelegationCard } from '../overview/DelegationCard';
import { MAX_POOLS_COUNT, Page, useDelegationPortfolioStore, useStakePoolDetails } from '../store';
import { PoolDetailsCard } from './PoolDetailsCard';

export const StakePoolPreferencesFooter = () => {
  const { t } = useTranslation();
  const portfolioMutators = useDelegationPortfolioStore((store) => store.mutators);

  return (
    <Flex flexDirection="column" alignItems="stretch" gap="$16">
      <Button.CallToAction
        label={t('drawer.preferences.nextButton')}
        data-testid="preferences-next-button"
        onClick={() => portfolioMutators.transition('next')}
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
    draftPortfolio: state.draftPortfolio,
    portfolioMutators: state.mutators,
  }));
  const { activePage, setActivePage } = useStakePoolDetails((store) => ({
    activePage: store.activePage,
    setActivePage: store.setActivePage,
  }));

  const displayData = draftPortfolio.map(({ name, id }, i) => ({
    color: PIE_CHART_DEFAULT_COLOR_SET[i] as PieChartColor,
    id,
    name: name || '',
    value: 1,
  }));
  const addPoolButtonDisabled = draftPortfolio.length === MAX_POOLS_COUNT;
  const onAddPoolButtonClick = () => {
    if (addPoolButtonDisabled) return;
    if (activePage !== Page.browsePools) {
      setActivePage(Page.browsePools);
    }
    portfolioMutators.cancelManagementProcess({ dumpDraftToSelections: true });
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
        {displayData.map(({ name, id, color }) => (
          <PoolDetailsCard key={id} poolId={id} name={name} color={color} />
        ))}
      </Flex>
    </Flex>
  );
};
