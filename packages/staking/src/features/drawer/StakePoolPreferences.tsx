import { Button, Flex, PIE_CHART_DEFAULT_COLOR_SET, PieChartColor, Text } from '@lace/ui';
import { useTranslation } from 'react-i18next';
import { DelegationCard } from '../overview/DelegationCard';
import { Sections, sectionsConfig, useDelegationPortfolioStore, useStakePoolDetails } from '../store';
import { PoolDetailsCard } from './PoolDetailsCard';

export const StakePoolPreferencesFooter = () => {
  const { setSection } = useStakePoolDetails();
  return (
    <Flex flexDirection={'column'} alignItems={'stretch'} gap={'$16'}>
      <Button.CallToAction
        label={'Next'}
        data-testid={'preferencesNextButton'}
        onClick={() => setSection(sectionsConfig[Sections.CONFIRMATION])}
        w={'$fill'}
      />
    </Flex>
  );
};

// eslint-disable-next-line react/no-multi-comp
export const StakePoolPreferences = () => {
  const { t } = useTranslation();
  const draftPortfolio = useDelegationPortfolioStore((state) => state.draftPortfolio);
  return (
    <Flex flexDirection={'column'} gap={'$32'} alignItems={'stretch'}>
      <DelegationCard
        distribution={draftPortfolio.map(({ name, weight }, i) => ({
          color: PIE_CHART_DEFAULT_COLOR_SET[i] as PieChartColor,
          name: name || '',
          value: weight,
        }))}
        status={'ready'}
        showDistribution
      />
      <Text.Body.Large weight="$semibold">
        {t('drawer.preferences.selectedStakePools', { count: draftPortfolio.length })}
      </Text.Body.Large>
      <Flex flexDirection={'column'} gap={'$16'} pb={'$32'} alignItems={'stretch'}>
        {draftPortfolio.map(({ name, id }, i) => (
          <PoolDetailsCard
            key={i}
            index={i}
            poolId={id}
            name={name || ''}
            draftPortfolioLength={draftPortfolio.length}
            colorSet={PIE_CHART_DEFAULT_COLOR_SET}
          />
        ))}
      </Flex>
    </Flex>
  );
};
