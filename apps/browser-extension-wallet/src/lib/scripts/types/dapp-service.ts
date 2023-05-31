import { Wallet } from '@lace/cardano';

export type DappDataService = {
  getSignTxData: () => Promise<Wallet.Cardano.Tx>;
  getSignDataData: () => Promise<{
    addr: Wallet.Cardano.PaymentAddress;
    payload: Wallet.HexBlob;
  }>;
};
