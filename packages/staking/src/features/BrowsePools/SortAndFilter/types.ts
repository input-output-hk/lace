export enum PoolsFilter {
  Saturation = 'SATURATION',
  ProfitMargin = 'PROFIT_MARGIN',
  Performance = 'PERFORMANCE',
  Ros = 'ROS',
}

export type SelectOption = { label: string; value: string; selected: boolean };

export type FilterOption = {
  key: PoolsFilter;
  title: string;
  type: 'input' | 'select';
  opts: string[] | SelectOption[];
};

export interface FilterValues {
  [PoolsFilter.Saturation]: string[];
  [PoolsFilter.ProfitMargin]: string[];
  [PoolsFilter.Performance]: string[];
  [PoolsFilter.Ros]: string[];
}

export enum SortAndFilterTab {
  sort = 'sort',
  filter = 'filter',
}
