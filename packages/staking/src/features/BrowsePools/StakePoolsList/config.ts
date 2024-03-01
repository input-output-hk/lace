import { MetricType } from 'features/BrowsePools/types';
import { stakePoolCellRendererByMetricType } from './stakePoolCellRendererByMetricType';

export const hiddenColumns = [process.env.USE_ROS_STAKING_COLUMN !== 'true' && MetricType.apy].filter((c) => !!c);

export const config = {
  columns: (Object.keys(MetricType).filter((v) => Number.isNaN(Number(v))) as MetricType[]).filter(
    (column) => !hiddenColumns.includes(column)
  ),
  renderer: stakePoolCellRendererByMetricType,
};
