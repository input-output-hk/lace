import { Wallet } from '@lace/cardano';
import { cip30 as walletCip30 } from '@cardano-sdk/wallet';

export type DappDataService = {
  getSignTxData: () => Promise<{ dappInfo: Wallet.DappInfo; tx: walletCip30.SignTxCallbackParams['data'] }>;
  getSignDataData: () => Promise<{
    dappInfo: Wallet.DappInfo;
    sign: walletCip30.SignDataCallbackParams['data'];
  }>;
  getDappInfo: () => Promise<Wallet.DappInfo>;
  getCollateralRequest: () => Promise<{
    dappInfo: Wallet.DappInfo;
    collateralRequest: walletCip30.GetCollateralCallbackParams['data'];
  }>;
};
