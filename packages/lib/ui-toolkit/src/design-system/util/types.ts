import type { AccountId } from '@lace-contract/wallet-repo';

export type BrowsePoolSortOption =
  | 'blocks'
  | 'cost'
  | 'liveStake'
  | 'margin'
  | 'pledge'
  | 'saturation'
  | 'ticker';

export type BrowsePoolSortOrder = 'asc' | 'desc';

export type AnyAddress = {
  name?: string;
  address: string;
  blockchainName: string;
  accountId?: AccountId;
};

export type ContactItem = {
  id: string;
  name: string;
  avatar?: string;
  addresses: AnyAddress[];
};
