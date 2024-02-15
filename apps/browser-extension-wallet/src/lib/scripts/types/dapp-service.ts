import { Wallet } from '@lace/cardano';
import { cip30 as walletCip30 } from '@cardano-sdk/wallet';

export type DappDataService = {
  getDappInfo: () => Promise<Wallet.DappInfo>;
  getCollateralRequest: () => Promise<{
    dappInfo: Wallet.DappInfo;
    collateralRequest: walletCip30.GetCollateralCallbackParams['data'];
  }>;
};
