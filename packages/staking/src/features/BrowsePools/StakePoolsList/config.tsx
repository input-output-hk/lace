/* eslint-disable no-magic-numbers */
import inRange from 'lodash/inRange';
import { ReactNode } from 'react';
import { USE_ROS_STAKING_COLUMN } from '../../../featureFlags';
import { StakePoolDetails } from '../../store';
import { SaturationLevels, SortField } from '../types';
import { StakePoolListCell } from './StakePoolListCell';

// TODO move saturation-related logic to higher level e.g. features/staking, as it's not coupled with BrowsePools
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

type StakePoolsListRenderer = {
  [K in SortField]: ({ value }: { value: StakePoolDetails[K] }) => ReactNode;
};

type StakePoolsListConfig = {
  columns: SortField[];
  renderer: StakePoolsListRenderer;
};

const columns = [
  'ticker',
  'saturation',
  USE_ROS_STAKING_COLUMN && 'ros',
  'cost',
  'margin',
  'blocks',
  'pledge',
  'liveStake',
].filter(Boolean) as SortField[];

const createCellRenderer =
  <T extends SortField>(sortField: T) =>
  ({ value }: { value: StakePoolDetails[T] }) =>
    <StakePoolListCell sortField={sortField} {...{ [sortField]: value }} />;

export const config: StakePoolsListConfig = {
  columns,
  renderer: columns.reduce<StakePoolsListRenderer>((renderer, column) => {
    renderer[column] = createCellRenderer(column);
    return renderer;
  }, {} as StakePoolsListRenderer),
};
