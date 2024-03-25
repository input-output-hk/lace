import { BrowsePoolsView, StakePoolSortOptions } from './types';

export const SEARCH_DEBOUNCE_IN_MS = 300;

export const DEFAULT_SORT_OPTIONS: StakePoolSortOptions = {
  field: 'ticker',
  order: 'asc',
};

export const DEFAULT_BROWSE_POOLS_VIEW: BrowsePoolsView = BrowsePoolsView.grid;
