import { Wallet } from '@lace/cardano';

export type StakePoolTableItemBrowserProps = {
  id: string;
  hexId: Wallet.Cardano.PoolIdHex;
  name: string;
  ticker: string;
  apy?: string;
  saturation: string;
  cost: string;
  margin: string;
  blocks: string;
  pledge: string;
  liveStake: string;
  selectionDisabledMessage?: string;
  stakePool: Wallet.Cardano.StakePool;
  onClick?: () => void;
};
