import { Button, Flex, PIE_CHART_DEFAULT_COLOR_SET, PieChartColor, Text } from '@lace/ui';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../outside-handles-provider';
import { DelegationCard } from '../overview/DelegationCard';
import { Sections, sectionsConfig, useDelegationPortfolioStore, useStakePoolDetails } from '../store';
import { PoolDetailsCard } from './PoolDetailsCard';

export const StakePoolPreferencesFooter = () => {
  const { t } = useTranslation();
  const { setSection } = useStakePoolDetails();

  return (
    <Flex flexDirection="column" alignItems="stretch" gap="$16">
      <Button.CallToAction
        label={t('drawer.preferences.nextButton')}
        data-testid="preferences-next-button"
        onClick={() => setSection(sectionsConfig[Sections.CONFIRMATION])}
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
  const draftPortfolio = useDelegationPortfolioStore((state) => state.draftPortfolio);
  return (
    <Flex flexDirection="column" gap="$32" alignItems="stretch">
      <DelegationCard
        balance={compactNumber(balancesBalance.available.coinBalance)}
        cardanoCoinSymbol={symbol}
        distribution={draftPortfolio.map(({ name, weight }, i) => ({
          color: PIE_CHART_DEFAULT_COLOR_SET[i] as PieChartColor,
          name: name || '',
          value: weight,
        }))}
        status="ready"
        showDistribution
      />
      <Text.Body.Large weight="$semibold">
        {t('drawer.preferences.selectedStakePools', { count: draftPortfolio.length })}
      </Text.Body.Large>
      <Flex flexDirection="column" gap="$16" pb="$32" alignItems="stretch">
        {draftPortfolio.map(({ name, id }, i) => (
          <PoolDetailsCard
            key={i}
            poolId={id}
            name={name || ''}
            draftPortfolioLength={draftPortfolio.length}
            color={PIE_CHART_DEFAULT_COLOR_SET[i]!}
            deleteEnabled={draftPortfolio.length > 1}
          />
        ))}
      </Flex>
    </Flex>
  );
};
