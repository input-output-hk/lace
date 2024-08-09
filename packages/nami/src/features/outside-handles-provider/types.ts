import type { CreateWalletParams } from '../../types/wallet';
import type {
  WalletManagerActivateProps,
  WalletManagerApi,
  WalletRepositoryApi,
} from '@cardano-sdk/web-extension';
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
  createWallet: (
    args: Readonly<CreateWalletParams>,
  ) => Promise<Wallet.CardanoWallet>;
  getMnemonic: (passphrase: Uint8Array) => Promise<string[]>;
  deleteWallet: (
    isForgotPasswordFlow?: boolean,
  ) => Promise<WalletManagerActivateProps | undefined>;
  fiatCurrency: string;
  setFiatCurrency: (fiatCurrency: string) => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  transformedCardano: IAssetDetails;
  walletAddress: string;
  inMemoryWallet: Wallet.ObservableWallet;
  currentChain: Wallet.Cardano.ChainId;
  walletManager: WalletManagerApi;
  walletRepository: WalletRepositoryApi<
    Wallet.WalletMetadata,
    Wallet.AccountMetadata
  >;
  withSignTxConfirmation: <T>(
    action: () => Promise<T>,
    password?: string,
  ) => Promise<T>;
}
