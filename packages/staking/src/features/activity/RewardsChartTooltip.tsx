import { Card, Flex, PIE_CHART_DEFAULT_COLOR_SET, Text } from '@lace/ui';
import { useTranslation } from 'react-i18next';
import { TooltipProps } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { GRAYSCALE_PALETTE, maxPoolsIterator } from './const';
import { PoolIndicator } from './PoolIndicator';
import { usePoolInPortfolioPresence } from './usePoolInPortfolioPresence';

export const RewardsChartTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  const { t } = useTranslation();
  const { checkIfPoolIsInPortfolio } = usePoolInPortfolioPresence();
  if (active && payload && payload.length > 0) {
    return (
      <Card.Elevated className="custom-tooltip">
        <Flex flexDirection="column" px="$16" py="$8">
          <Text.Body.Small weight="$semibold">
            {t('activity.rewardsChart.epoch')} {label}
          </Text.Body.Small>
          <Flex flexDirection="column" gap="$4">
            {maxPoolsIterator.map((_, i) => {
              const poolId = payload[i]?.payload?.rewards?.[i]?.poolId;
              const poolInPortfolio = payload[i] && checkIfPoolIsInPortfolio(poolId);
              return (
                payload[i] && (
                  <Flex gap="$8" key={i} alignItems="center">
                    <PoolIndicator color={poolInPortfolio ? PIE_CHART_DEFAULT_COLOR_SET[i] : GRAYSCALE_PALETTE[i]} />
                    <Flex flexDirection="column">
                      <Text.Body.Small>{payload[i]?.payload?.rewards?.[i]?.metadata.name}</Text.Body.Small>
                      <Text.Body.Small>
                        {t('activity.rewardsChart.rewards')}: {payload[i]?.value} ADA
                      </Text.Body.Small>
                    </Flex>
                  </Flex>
                )
              );
            })}
          </Flex>
        </Flex>
      </Card.Elevated>
    );
  }

  return null;
};
