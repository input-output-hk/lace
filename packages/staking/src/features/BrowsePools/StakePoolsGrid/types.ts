import { Wallet } from '@lace/cardano';
import { SortField } from 'features/BrowsePools';

export type StakePoolsGridItemProps = {
  id: string;
  hexId: Wallet.Cardano.PoolIdHex;
  ticker?: string;
  ros?: string;
  saturation?: string;
  cost: { number: string; unit?: string };
  margin?: string;
  blocks?: string;
  pledge: { number: string; unit?: string };
  liveStake: { number: string; unit?: string };
  stakePool: Wallet.Cardano.StakePool;
  sortField: SortField;
};
