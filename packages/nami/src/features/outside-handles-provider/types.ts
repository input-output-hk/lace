import type { Events } from '../../features/analytics/events';
import type { CreateWalletParams } from '../../types/wallet';
import type {
  AnyBip32Wallet,
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

export interface WalletManagerAddAccountProps {
  wallet: AnyBip32Wallet<Wallet.WalletMetadata, Wallet.AccountMetadata>;
  metadata: Wallet.AccountMetadata;
  accountIndex: number;
  passphrase?: Uint8Array;
}

export interface OutsideHandlesContextValue {
  collateralFee: bigint;
  isInitializingCollateral: boolean;
  initializeCollateralTx: () => Promise<void>;
  submitCollateralTx: () => Promise<void>;
  addAccount: (props: Readonly<WalletManagerAddAccountProps>) => Promise<void>;
  removeDapp: (origin: string) => Promise<boolean>;
  connectedDapps: Wallet.DappInfo[];
  isAnalyticsOptIn: boolean;
  handleAnalyticsChoice: (isOptIn: boolean) => Promise<void>;
  sendEventToPostHog: (action: Events) => Promise<void>;
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
  walletAddress: string;
  inMemoryWallet: Wallet.ObservableWallet;
  currentChain: Wallet.Cardano.ChainId;
  cardanoPrice: number;
  walletManager: WalletManagerApi;
  walletRepository: WalletRepositoryApi<
    Wallet.WalletMetadata,
    Wallet.AccountMetadata
  >;
  withSignTxConfirmation: <T>(
    action: () => Promise<T>,
    password?: string,
  ) => Promise<T>;
  switchNetwork: (chainName: Wallet.ChainName) => Promise<void>;
  environmentName: Wallet.ChainName;
  availableChains: Wallet.ChainName[];
  enableCustomNode: (network: Wallet.ChainName, value: string) => Promise<void>;
  getCustomSubmitApiForNetwork: (network: Wallet.ChainName) => {
    status: boolean;
    url: string;
  };
  defaultSubmitApi: string;
  cardanoCoin: Wallet.CoinId;
  isValidURL: (link: string) => boolean;
  setAvatar: (image: string) => void;
}
