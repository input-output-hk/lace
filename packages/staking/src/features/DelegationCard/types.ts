import { PieChartColor } from '@input-output-hk/lace-ui-toolkit';

export type DistributionItem = {
  name: string;
  percentage: number;
  color: PieChartColor;
  ros?: string;
  saturation?: string;
};
