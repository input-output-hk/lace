import { Wallet } from '@lace/cardano';

export type StakePoolTableItemBrowserProps = {
  id: string;
  hexId: Wallet.Cardano.PoolIdHex;
  ticker?: string;
  apy?: string;
  saturation?: string;
  cost: { number: string; unit?: string };
  margin?: string;
  blocks?: string;
  pledge: { number: string; unit?: string };
  liveStake: { number: string; unit?: string };
  stakePool: Wallet.Cardano.StakePool;
  hideSelected?: boolean;
};
