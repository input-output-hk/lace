import { SortField as SortFieldSDK } from '@cardano-sdk/core';
export enum BrowsePoolsView {
  grid = 'grid',
  table = 'table',
}

export enum SaturationLevels {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Veryhigh = 'veryHigh',
  Oversaturated = 'oversaturated',
}

// TODO remove 'ticker', when it's included in SortFieldSDK
// APY is deprecated and replaced by ROS
export type SortField = 'ticker' | Exclude<SortFieldSDK, 'apy' | 'lastRos' | 'name'>;

export enum SortDirection {
  asc = 'asc',
  desc = 'desc',
}

export type StakePoolSortOptions = {
  field: SortField;
  order: SortDirection;
};

export type TranslationsFor<T extends string> = Record<T, string>;
