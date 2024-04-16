import { BrowsePoolsView, StakePoolSortOptions, StakingBrowserPreferences } from './types';
import { getDefaultSortOrderByField } from './utils';

export const SEARCH_DEBOUNCE_IN_MS = 300;

export const DEFAULT_SORT_OPTIONS: StakePoolSortOptions = {
  field: 'ticker',
  order: getDefaultSortOrderByField('ticker'),
};

export const DEFAULT_BROWSE_POOLS_VIEW: BrowsePoolsView = BrowsePoolsView.grid;

export const DEFAULT_STAKING_BROWSER_PREFERENCES: StakingBrowserPreferences = {
  poolsView: DEFAULT_BROWSE_POOLS_VIEW,
  selectedPoolIds: [],
};
