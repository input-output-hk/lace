import { PoolsFilter } from '../../store';

export type SelectOption = { label: string; value: string; selected: boolean };

export type FilterOption = {
  key: PoolsFilter;
  title: string;
  type: 'input' | 'select';
  opts: string[] | SelectOption[];
};

export enum SortAndFilterTab {
  sort = 'sort',
  filter = 'filter',
}
