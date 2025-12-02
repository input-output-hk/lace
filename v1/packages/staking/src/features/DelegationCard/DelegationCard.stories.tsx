import { PieChartGradientColor } from '@input-output-hk/lace-ui-toolkit';
import type { Meta } from '@storybook/react';
import { DelegationCard } from './DelegationCard';

export default {
  title: 'DelegationCard',
} as Meta;

// TODO https://input-output.atlassian.net/browse/LW-9492
export const Overview = () => (
  <>
    <DelegationCard
      arrangement="horizontal"
      balance="10000"
      cardanoCoinSymbol="ADA"
      distribution={[{ color: PieChartGradientColor.LaceLinearGradient, name: 'A', percentage: 100 }]}
      status="simple-delegation"
    />
    <hr />
    <DelegationCard
      arrangement="vertical"
      balance="10000"
      cardanoCoinSymbol="ADA"
      distribution={[{ color: PieChartGradientColor.LaceLinearGradient, name: 'A', percentage: 100 }]}
      status="multi-delegation"
    />
  </>
);
