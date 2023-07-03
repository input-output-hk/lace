import { Wallet } from '@lace/cardano';

export type DappDataService = {
  getSignTxData: () => Promise<{ dappInfo: Wallet.DappInfo; tx: Wallet.Cardano.Tx }>;
  getSignDataData: () => Promise<{
    dappInfo: Wallet.DappInfo;
    sign: {
      addr: Wallet.Cardano.PaymentAddress;
      payload: Wallet.HexBlob;
    };
  }>;
  getDappInfo: () => Promise<Wallet.DappInfo>;
};
