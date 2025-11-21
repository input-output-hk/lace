import { Card, Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import { useTranslation } from 'react-i18next';
import { TooltipProps } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { useRewardsChartPoolsColorMapper } from './hooks/useRewardsChartPoolsColorMapper';
import { PoolIndicator } from './PoolIndicator';

export const RewardsChartTooltip = ({
  active,
  payload,
  label,
  poolColorMapper,
}: TooltipProps<ValueType, NameType> & { poolColorMapper: ReturnType<typeof useRewardsChartPoolsColorMapper> }) => {
  const { t } = useTranslation();

  if (active && payload && payload.length > 0) {
    return (
      <Card.Elevated className="custom-tooltip">
        <Flex flexDirection="column" px="$16" py="$8">
          <Text.Body.Small weight="$semibold">
            {t('activity.rewardsChart.epoch')} {label}
          </Text.Body.Small>
          <Flex flexDirection="column" gap="$4">
            {payload.map((p, i) => {
              const poolId = p.payload?.rewards?.[i]?.poolId;
              return (
                <Flex gap="$8" key={i} alignItems="center">
                  <PoolIndicator color={poolColorMapper(poolId)} />
                  <Flex flexDirection="column">
                    <Text.Body.Small>{p.payload?.rewards?.[i]?.metadata?.name || '-'}</Text.Body.Small>
                    <Text.Body.Small>
                      {t('activity.rewardsChart.rewards')}: {payload[i]?.value} ADA
                    </Text.Body.Small>
                  </Flex>
                </Flex>
              );
            })}
          </Flex>
        </Flex>
      </Card.Elevated>
    );
  }

  return null;
};
