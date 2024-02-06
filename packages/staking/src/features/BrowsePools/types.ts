export enum BrowsePoolsView {
  grid = 'grid',
  table = 'table',
}

export enum MetricType {
  ticker = 'ticker',
  saturation = 'saturation',
  apy = 'apy',
  cost = 'cost',
  margin = 'margin',
  blocks = 'blocks',
  pledge = 'pledge',
  liveStake = 'liveStake',
}

// TODO: update once updated on sdk side
export enum SortField {
  name = 'name',
  apy = 'apy',
  saturation = 'saturation',
  cost = 'cost',
}

export type StakePoolSortOptions = {
  field: SortField;
  order: SortDirection;
};

export enum SortDirection {
  asc = 'asc',
  desc = 'desc',
}

export type TranslationsFor<T extends string> = Record<T, string>;
