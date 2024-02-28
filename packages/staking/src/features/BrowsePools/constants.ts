import { SortDirection, SortField, StakePoolSortOptions } from './types';

export const SEARCH_DEBOUNCE_IN_MS = 300;

export const DEFAULT_SORT_OPTIONS: StakePoolSortOptions = {
  field: SortField.name,
  order: SortDirection.desc,
};
