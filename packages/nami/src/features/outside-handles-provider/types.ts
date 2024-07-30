import type { WalletRepositoryApi } from '@cardano-sdk/web-extension';
import type { Wallet } from '@lace/cardano';
export interface IAssetDetails {
  id: string;
  logo: string;
  name: string;
  ticker: string;
  price: string;
  variation: string;
  balance: string;
  fiatBalance: string;
}

export interface OutsideHandlesContextValue {
  transformedCardano: IAssetDetails;
  walletAddress: string;
  fullWalletName: string;
  inMemoryWallet: Wallet.ObservableWallet;
  currentChain: Wallet.Cardano.ChainId;
  withSignTxConfirmation: <T>(
    action: () => Promise<T>,
    password?: string,
  ) => Promise<T>;
}
