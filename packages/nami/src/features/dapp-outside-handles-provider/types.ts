import type { Serialization } from '@cardano-sdk/core';
import type { Cip30DataSignature } from '@cardano-sdk/dapp-connector';
import type {
  WalletManagerApi,
  WalletRepositoryApi,
  WalletType,
} from '@cardano-sdk/web-extension';
import type { Wallet } from '@lace/cardano';
import type { HexBlob } from '@lace/cardano/dist/wallet';

export interface DappConnector {
  getDappInfo: () => Promise<Wallet.DappInfo>;
  authorizeDapp: (
    authorization: 'allow' | 'deny',
    url: string,
    onCleanup: () => void,
  ) => void;
  getSignTxRequest: () => Promise<{
    dappInfo: Wallet.DappInfo;
    request: {
      data: {
        tx: Serialization.TxCBOR;
        addresses: Wallet.KeyManagement.GroupedAddress[];
      };
      reject: (onCleanup: () => void) => Promise<void>;
      sign: (password: string) => Promise<void>;
    };
  }>;
  getSignDataRequest: () => Promise<{
    dappInfo: Wallet.DappInfo;
    request: {
      data: {
        payload: HexBlob;
        address:
          | Wallet.Cardano.DRepID
          | Wallet.Cardano.PaymentAddress
          | Wallet.Cardano.RewardAccount;
      };
      reject: (onCleanup: () => void) => Promise<void>;
      sign: (password: string) => Promise<Cip30DataSignature>;
    };
  }>;
}

export interface OutsideHandlesContextValue {
  theme: 'dark' | 'light';
  inMemoryWallet: Wallet.ObservableWallet;
  walletManager: WalletManagerApi;
  walletRepository: WalletRepositoryApi<
    Wallet.WalletMetadata,
    Wallet.AccountMetadata
  >;
  environmentName: Wallet.ChainName;
  dappConnector: DappConnector;
  withSignTxConfirmation: <T>(
    action: () => Promise<T>,
    password?: string,
  ) => Promise<T>;
  cardanoCoin: Wallet.CoinId;
  walletType: WalletType;
  openHWFlow: (path: string) => void;
}
