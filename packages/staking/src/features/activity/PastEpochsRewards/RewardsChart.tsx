import { Card } from '@input-output-hk/lace-ui-toolkit';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { RewardsByEpoch } from './hooks/useRewardsByEpoch';
import { useRewardsChartPoolsColorMapper } from './hooks/useRewardsChartPoolsColorMapper';
import { RewardsChartTooltip } from './RewardsChartTooltip';

export const RewardsChart = ({ chartData }: { chartData: RewardsByEpoch }) => {
  const poolColorMapper = useRewardsChartPoolsColorMapper(chartData);
  const maxPoolsPerEpochCount = chartData.reduce((acc, epochRewards) => Math.max(acc, epochRewards.rewards.length), 0);

  return (
    <Card.Outlined>
      <ResponsiveContainer width="100%" aspect={2.4} height="auto">
        <BarChart
          width={500}
          height={300}
          data={chartData}
          margin={{
            bottom: 32,
            left: 24,
            right: 24,
            top: 32,
          }}
        >
          <XAxis dataKey="spendableEpoch" tickLine={false} axisLine={false} tickMargin={16} />
          <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${value} ADA`} />
          <Tooltip cursor={false} content={<RewardsChartTooltip poolColorMapper={poolColorMapper} />} />
          {Array.from({ length: maxPoolsPerEpochCount }).map((_, i) => (
            <Bar key={i} dataKey={`rewards[${i}].rewards`} stackId="a" maxBarSize={24} isAnimationActive={false}>
              {chartData.map((entry, j) => {
                const fill = poolColorMapper(entry.rewards[i]?.poolId);
                return <Cell key={`cell-${j}`} fill={fill} />;
              })}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Card.Outlined>
  );
};
