import { Card, PIE_CHART_DEFAULT_COLOR_SET } from '@lace/ui';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { GRAYSCALE_PALETTE, maxPoolsIterator } from './const';
import { RewardsChartTooltip } from './RewardsChartTooltip';
import { usePoolInPortfolioPresence } from './usePoolInPortfolioPresence';
import { RewardsByEpoch } from './useRewardsByEpoch';

export const RewardsChart = ({ chartData }: { chartData: RewardsByEpoch }) => {
  const { checkIfPoolIsInPortfolio } = usePoolInPortfolioPresence();
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
          <XAxis dataKey="epoch" tickLine={false} axisLine={false} tickMargin={16} />
          <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${value} ADA`} />
          <Tooltip cursor={false} content={<RewardsChartTooltip />} />
          {maxPoolsIterator.map((_, i) => (
            <Bar key={i} dataKey={`rewards[${i}].rewards`} stackId="a" maxBarSize={24}>
              {chartData.map((entry, j) => {
                const fill =
                  entry.rewards[i]?.poolId && checkIfPoolIsInPortfolio(entry.rewards[i]?.poolId)
                    ? PIE_CHART_DEFAULT_COLOR_SET[i]
                    : GRAYSCALE_PALETTE[i];
                return <Cell key={`cell-${j}`} fill={fill} />;
              })}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Card.Outlined>
  );
};
