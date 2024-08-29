import type { Events } from '../../features/analytics/events';
import type { CreateWalletParams } from '../../types/wallet';
import type { Serialization, EraSummary } from '@cardano-sdk/core';
import type { Cip30DataSignature } from '@cardano-sdk/dapp-connector';
import type {
  AnyBip32Wallet,
  WalletManagerActivateProps,
  WalletManagerApi,
  WalletRepositoryApi,
  WalletType,
} from '@cardano-sdk/web-extension';
import type { Wallet } from '@lace/cardano';
import type { HexBlob } from '@lace/cardano/dist/wallet';
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
  walletAddresses: string[];
  eraSummaries: EraSummary[];
  transactions: Wallet.Cardano.HydratedTx[];
  getTxInputsValueAndAddress: (
    inputs: Readonly<Wallet.Cardano.HydratedTxIn[] | Wallet.Cardano.TxIn[]>,
  ) => Promise<Wallet.TxInput[]>;
  certificateInspectorFactory: <T extends Wallet.Cardano.Certificate>(
    type: Wallet.Cardano.CertificateType,
  ) => (tx: Readonly<Wallet.Cardano.Tx>) => Promise<T | undefined>;
  openHWFlow: (path: string) => void;
  walletType: WalletType;
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
  dappConnector: DappConnector;
}
