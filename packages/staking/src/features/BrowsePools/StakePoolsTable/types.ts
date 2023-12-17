import { Wallet } from '@lace/cardano';

export enum Columns {
  ticker = 'ticker',
  apy = 'apy',
  saturation = 'saturation',
  cost = 'cost',
  margin = 'margin',
  blocks = 'blocks',
  pledge = 'pledge',
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

export enum SortField {
  name = 'name',
  apy = 'apy',
  saturation = 'saturation',
  cost = 'cost',
}
