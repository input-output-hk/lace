/* eslint-disable no-magic-numbers */
import { ReactNode } from 'react';
import { USE_ROS_STAKING_COLUMN } from '../../../featureFlags';
import { StakePoolDetails } from '../../store';
import { SortField } from '../types';
import { StakePoolListCell } from './StakePoolListCell';

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
