import { PieChartColor } from '@lace/ui';

export type DistributionItem = {
  name: string;
  percentage: number;
  color: PieChartColor;
  apy?: string;
  saturation?: string;
};
