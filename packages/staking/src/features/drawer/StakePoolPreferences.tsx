import { Flex, PIE_CHART_DEFAULT_COLOR_SET, PieChartColor, Text } from '@lace/ui';
import { DelegationCard } from '../overview/DelegationCard';
import { useDelegationPortfolioStore } from '../store';
import { PoolDetailsCard } from './PoolDetailsCard';

export const StakePoolPreferences = () => {
  const draftPortfolio = useDelegationPortfolioStore((state) => state.draftPortfolio);
  return (
    <Flex flexDirection={'column'} gap={'$16'} alignItems={'stretch'}>
      <DelegationCard
        distribution={draftPortfolio.map(({ name, weight }, i) => ({
          color: PIE_CHART_DEFAULT_COLOR_SET[i] as PieChartColor,
          name: name || '',
          value: weight,
        }))}
        status={'ready'}
      />
      <Text.Body.Large>Selected stake pools (1)</Text.Body.Large>
      {draftPortfolio.map(({ name }, i) => (
        <PoolDetailsCard key={i} index={i} name={name || ''} draftPortfolioLength={draftPortfolio.length} />
      ))}
    </Flex>
  );
};
