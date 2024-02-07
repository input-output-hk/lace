import { Wallet } from '@lace/cardano';

export enum Columns {
  ticker = 'ticker',
  saturation = 'saturation',
  apy = 'apy',
  cost = 'cost',
  margin = 'margin',
  blocks = 'blocks',
  pledge = 'pledge',
  liveStake = 'liveStake',
}

export type TranslationsFor<T extends string> = Record<T, string>;
export enum SortDirection {
  asc = 'asc',
  desc = 'desc',
}

export type StakePoolSortOptions = {
  field: Wallet.SortField;
  order: SortDirection;
};

// TODO: update once updated on sdk side
export enum SortField {
  name = 'name',
  apy = 'apy',
  saturation = 'saturation',
  ticker = 'ticker',
  cost = 'cost',
  margin = 'margin',
  ros = 'ros',
  livestake = 'livestake',
  blocks = 'blocks',
  pledge = 'pledge',
}

export enum SaturationLevels {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Veryhigh = 'veryHigh',
  Oversaturated = 'oversaturated',
}

export enum SaturationLevelColors {
  red = 'red',
  orange = 'orange',
  yellow = 'yellow',
  green = 'green',
}
