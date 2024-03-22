import { SortField as SortFieldSDK, SortOrder as SortOrderSDK } from '@cardano-sdk/core';

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
export type SortOrder = SortOrderSDK;

export type StakePoolSortOptions = {
  field: SortField;
  order: SortOrder;
};

export type TranslationsFor<T extends string> = Record<T, string>;
