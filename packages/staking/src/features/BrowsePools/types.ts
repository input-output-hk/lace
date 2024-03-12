import { SortField as SortFieldSDK } from '@cardano-sdk/core';

export enum BrowsePoolsView {
  grid = 'grid',
  table = 'table',
}

export enum SaturationLevels {
  Medium = 'medium',
  High = 'high',
  Veryhigh = 'veryHigh',
}

// TODO remove 'ticker', when it's included in SortFieldSDK; https://input-output.atlassian.net/browse/LW-9981
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
