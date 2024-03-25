import { PieChartColor } from '@lace/ui';

export type DistributionItem = {
  name: string;
  percentage: number;
  color: PieChartColor;
  ros?: string;
  saturation?: string;
};
