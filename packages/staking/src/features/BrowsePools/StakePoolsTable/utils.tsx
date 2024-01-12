/* eslint-disable no-magic-numbers */
import inRange from 'lodash/inRange';
import { stakePoolCellRenderer } from './StakePoolCellRenderer/StakePoolCellRenderer';
import { Columns, SaturationLevels } from './types';

const saturationLevelsRangeMap: Record<SaturationLevels, [number, number]> = {
  [SaturationLevels.Oversaturated]: [100, Number.MAX_SAFE_INTEGER],
  [SaturationLevels.Veryhigh]: [90, 100],
  [SaturationLevels.High]: [70, 90],
  [SaturationLevels.Medium]: [21, 70],
  [SaturationLevels.Low]: [0, 21],
};

type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];

export const getSaturationLevel = (saturation: number): SaturationLevels => {
  let result = SaturationLevels.Low;
  for (const [level, [min, max]] of Object.entries(saturationLevelsRangeMap) as Entries<
    typeof saturationLevelsRangeMap
  >) {
    if (inRange(saturation, min, max)) {
      result = level;
      return result;
    }
  }
  return result;
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
