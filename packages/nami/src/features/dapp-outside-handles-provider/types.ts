import type {
  Inspector,
  Serialization,
  TransactionSummaryInspection,
  TxInspector,
} from '@cardano-sdk/core';
import type { Cip30DataSignature } from '@cardano-sdk/dapp-connector';
import type {
  WalletManagerApi,
  WalletRepositoryApi,
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
  getAssetInfos: ({
    assetIds,
    tx,
  }: Readonly<{
    assetIds: Wallet.Cardano.AssetId[];
    tx: Wallet.Cardano.Tx;
  }>) => Promise<Map<Wallet.Cardano.AssetId, Wallet.Asset.AssetInfo>>;
}

export interface DappOutsideHandlesContextValue {
  theme: 'dark' | 'light';
  walletManager: WalletManagerApi;
  walletRepository: WalletRepositoryApi<
    Wallet.WalletMetadata,
    Wallet.AccountMetadata
  >;
  environmentName: Wallet.ChainName;
  dappConnector: DappConnector;
}
