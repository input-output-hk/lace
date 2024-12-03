import type { CreateWalletParams } from '../../types/wallet';
import type { EraSummary } from '@cardano-sdk/core';
import type { TxBuilder } from '@cardano-sdk/tx-construction';
import type {
  AnyBip32Wallet,
  WalletManagerActivateProps,
  WalletManagerApi,
  WalletRepositoryApi,
} from '@cardano-sdk/web-extension';
import type { Wallet } from '@lace/cardano';
import type { PasswordObj as Password } from '@lace/core';
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
  isCompatibilityMode: boolean;
  handleAnalyticsChoice: (isOptIn: boolean) => Promise<void>;
  handleCompatibilityModeChoice: (
    isCompatibilityMode: boolean,
  ) => Promise<void>;
  hasEnoughAdaForCollateral: boolean;
  createWallet: (
    args: Readonly<CreateWalletParams>,
  ) => Promise<Wallet.CardanoWallet>;
  deleteWallet: (
    isForgotPasswordFlow?: boolean,
  ) => Promise<WalletManagerActivateProps | undefined>;
  fiatCurrency: string;
  setFiatCurrency: (fiatCurrency: string) => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  currentChain: Wallet.Cardano.ChainId;
  cardanoPrice: number;
  walletManager: WalletManagerApi;
  walletRepository: WalletRepositoryApi<
    Wallet.WalletMetadata,
    Wallet.AccountMetadata
  >;
  switchNetwork: (chainName: Wallet.ChainName) => Promise<void>;
  environmentName: Wallet.ChainName;
  availableChains: Wallet.ChainName[];
  enableCustomNode: (network: Wallet.ChainName, value: string) => Promise<void>;
  getCustomSubmitApiForNetwork: (network: Wallet.ChainName) => {
    status: boolean;
    url: string;
  };
  defaultSubmitApi: string;
  isValidURL: (link: string) => boolean;
  setAvatar: (image: string) => void;
  buildDelegation: (
    hexId?: Readonly<Wallet.Cardano.PoolIdHex>,
  ) => Promise<void>;
  signAndSubmitTransaction: () => Promise<void>;
  passwordUtil: {
    clearSecrets: () => void;
    password: Partial<Password>;
    setPassword: (pw: Readonly<Partial<Password>>) => void;
  };
  delegationTxFee: string;
  delegationStoreDelegationTxBuilder?: TxBuilder;
  collateralTxBuilder?: TxBuilder;
  setSelectedStakePool: (
    pool: Readonly<Wallet.Cardano.StakePool | undefined>,
  ) => void;
  isBuildingTx: boolean;
  stakingError: string;
  getStakePoolInfo: (
    id: Readonly<Wallet.Cardano.PoolId>,
  ) => Promise<Wallet.Cardano.StakePool[]>;
  resetDelegationState: () => void;
  hasNoFunds: boolean;
  switchWalletMode: () => Promise<void>;
  openExternalLink: (url: string) => void;
  walletAddresses: Wallet.Cardano.PaymentAddress[];
  eraSummaries: EraSummary[];
  transactions: {
    history: Wallet.Cardano.HydratedTx[];
    outgoing: {
      inFlight: Wallet.TxInFlight[];
      signed: Wallet.KeyManagement.WitnessedTx[];
    };
  };
  certificateInspectorFactory: <T extends Wallet.Cardano.Certificate>(
    type: Wallet.Cardano.CertificateType,
  ) => (tx: Readonly<Wallet.Cardano.Tx>) => Promise<T | undefined>;
  connectHW: (usbDevice: USBDevice) => Promise<Wallet.HardwareWalletConnection>;
  createHardwareWalletRevamped: (
    params: Readonly<{
      accountIndexes: number[];
      name: string;
      connection: Wallet.HardwareWalletConnection;
    }>,
  ) => Promise<Wallet.CardanoWallet>;
  saveHardwareWallet: (
    wallet: Readonly<Wallet.CardanoWallet>,
    chainName?: Wallet.ChainName,
  ) => Promise<void>;
  removeWallet: () => Promise<void>;
  setDeletingWallet: (isDeleting: boolean) => void;
  chainHistoryProvider: Wallet.ChainHistoryProvider;
  protocolParameters: Wallet.Cardano.ProtocolParameters;
  assetInfo: Wallet.Assets;
}
