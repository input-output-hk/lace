import type {
  BrowsePoolSortOption,
  BrowsePoolSortOrder,
} from '../design-system/util/types';

export const ORDERS = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

export const OPTIONS = {
  TICKER: 'ticker',
  COST: 'cost',
  MARGIN: 'margin',
} as const;

export const BROWSE_POOL_OPTIONS: readonly BrowsePoolSortOption[] = [
  'ticker',
  'saturation',
  'cost',
  'margin',
  'blocks',
  'pledge',
  'liveStake',
] as const;

const isBrowsePoolOption = (value: unknown): value is BrowsePoolSortOption =>
  BROWSE_POOL_OPTIONS.includes(value as BrowsePoolSortOption);

const isBrowsePoolSortOrder = (value: unknown): value is BrowsePoolSortOrder =>
  [ORDERS.ASC, ORDERS.DESC].includes(value as BrowsePoolSortOrder);

export const getOption = (value?: unknown): BrowsePoolSortOption | undefined =>
  isBrowsePoolOption(value) ? value : undefined;

export const getDefaultSortOrder = (
  option: BrowsePoolSortOption,
): BrowsePoolSortOrder => {
  if (option === OPTIONS.TICKER) return ORDERS.ASC;
  if (option === OPTIONS.COST) return ORDERS.ASC;
  if (option === OPTIONS.MARGIN) return ORDERS.ASC;
  return ORDERS.DESC;
};

export const getOrder = (value: unknown, option?: BrowsePoolSortOption) => {
  if (isBrowsePoolSortOrder(value)) return value;
  return option ? getDefaultSortOrder(option) : undefined;
};
