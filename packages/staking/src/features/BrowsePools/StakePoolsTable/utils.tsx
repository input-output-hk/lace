import { stakePoolCellRenderer } from './StakePoolCellRenderer/StakePoolCellRenderer';
import { Columns, SaturationLevelColors } from './types';

const SATURATION_LEVEL_100 = 100;
const SATURATION_LEVEL_105 = 105;
const SATURATION_LEVEL_110 = 110;

export const getSaturationLevelColor = (saturation: number): SaturationLevelColors => {
  let color;
  if (saturation > SATURATION_LEVEL_110) {
    color = SaturationLevelColors.red;
  } else if (saturation > SATURATION_LEVEL_105) {
    color = SaturationLevelColors.orange;
  } else if (saturation > SATURATION_LEVEL_100) {
    color = SaturationLevelColors.yellow;
  } else {
    color = SaturationLevelColors.green;
  }
  return color;
};

export const hiddenColumns = [process.env.USE_ROS_STAKING_COLUMN !== 'true' && Columns.apy].filter(
  (c) => !!c
) as Columns[];

export const config = {
  columns: (Object.keys(Columns).filter((v) => Number.isNaN(Number(v))) as Columns[]).filter(
    (column) => !hiddenColumns.includes(column)
  ),
  renderer: stakePoolCellRenderer,
};
