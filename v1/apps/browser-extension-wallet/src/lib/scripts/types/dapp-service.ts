import { Wallet } from '@lace/cardano';

export type DappDataService = {
  getDappInfo: () => Promise<Wallet.DappInfo>;
};
