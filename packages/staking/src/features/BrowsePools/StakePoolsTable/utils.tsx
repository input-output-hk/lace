import { stakePoolCellRenderer } from './StakePoolCellRenderer/StakePoolCellRenderer';
import { Columns } from './types';

export enum SaturationColors {
  red = 'red',
  orange = 'orange',
  yellow = 'yellow',
  green = 'green',
}
const SATURATION_LEVEL_100 = 100;
const SATURATION_LEVEL_105 = 105;
const SATURATION_LEVEL_110 = 110;

export const getSaturationLevel = (saturation: number): SaturationColors => {
  let color;
  if (saturation > SATURATION_LEVEL_110) {
    color = SaturationColors.red;
  } else if (saturation > SATURATION_LEVEL_105) {
    color = SaturationColors.orange;
  } else if (saturation > SATURATION_LEVEL_100) {
    color = SaturationColors.yellow;
  } else {
    color = SaturationColors.green;
  }
  return color;
};

export const config = {
  columns: Object.keys(Columns).filter((v) => Number.isNaN(Number(v))) as Columns[],
  renderer: stakePoolCellRenderer,
};
