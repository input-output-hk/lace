import type { AccountId } from '@lace-contract/wallet-repo';

/**
 * Subset of stake-pool fields needed by browse UI (e.g. PoolCard), replicated here so
 * `@lace-lib/ui-toolkit` does not depend on `@lace-contract/cardano-stake-pools`.
 * Keep in sync with `LacePartialStakePool` (see compile-time check in that package).
 */
export interface LaceBrowsePool {
  poolId: string;
  ticker: string | null;
  liveSaturation: number;
  cost: number;
  margin: number;
  blocks: number;
  declaredPledge: number;
  liveStake: number;
}

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
