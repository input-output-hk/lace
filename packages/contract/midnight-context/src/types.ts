import type {
  MidnightNetworksConfig,
  PartialMidnightNetworksConfig,
  MidnightNetworkConfig,
  MidnightSDKNetworkId,
  MidnightSDKTestNetworkId,
} from './const';
import type { MidnightWalletsByAccountId } from './midnight-wallet';
import type {
  MidnightAccountId,
  MidnightDustAddress,
  MidnightShieldedAddress,
  MidnightUnshieldedAddress,
} from './value-objects';
import type { Percent } from '@cardano-sdk/util';
import type { CollectionStorage } from '@lace-contract/storage';
import type {
  AccountId,
  AccountRef,
  InMemoryWalletAccount,
  WalletId,
} from '@lace-contract/wallet-repo';
import type { Serializable } from '@lace-lib/util-store';
import type {
  BigNumber,
  ByteArray,
  HexBytes,
  MakePropertiesObservable,
} from '@lace-sdk/util';
import type {
  DustSecretKey,
  RawTokenType,
  SignatureVerifyingKey,
  ZswapSecretKeys,
} from '@midnight-ntwrk/ledger-v8';
import type { WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import type { Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import type {
  TransactionHistoryEntry,
  UnshieldedKeystore,
} from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import type { Observable } from 'rxjs';

export type LockStatus = 'locked' | 'unlocked' | 'unlocking';

export type DustGenerationDetails = {
  currentValue: bigint;
  maxCap: bigint;
  decayTime: number | undefined;
  maxCapReachedAt: number | undefined;
  rate: bigint;
};

export type DustParameters = {
  nightDustRatio: bigint;
  generationDecayRate: bigint;
};
export type ShouldAcknowledgeMidnightDisclaimer =
  | 'acknowledged'
  | 'not-shown'
  | 'shown';

export type MidnightAccountPublicKeys = {
  /** Hex-encoded ShieldedCoinPublicKey */
  coin: HexBytes;
  /** Hex-encoded ShieldedEncryptionPublicKey */
  encryption: HexBytes;
};

export type MidnightContextSliceState = {
  defaultNetworksConfig: MidnightNetworksConfig;
  defaultTestNetNetworkId: MidnightSDKTestNetworkId;
  userNetworksConfigOverrides: PartialMidnightNetworksConfig;
  remoteProofServerAddress?: string;
  isActivityPageHeaderBannerDismissed?: boolean;
  isPortfolioBannerDismissed?: boolean;
  supportedNetworksIds: MidnightSDKNetworkId[];
  dustBalanceByAccount: Partial<Record<MidnightAccountId, BigNumber>>;
  dustGenerationDetailsByAccount: Partial<
    Record<MidnightAccountId, Serializable<DustGenerationDetails>>
  >;
  shouldAcknowledgeMidnightDisclaimer: ShouldAcknowledgeMidnightDisclaimer;
  publicKeysByAccount: Partial<
    Record<MidnightAccountId, MidnightAccountPublicKeys>
  >;
  networkTermsAndConditions?: {
    url: string;
    hash: string;
  };
};

export type MidnightAddressKind = 'dust' | 'shielded' | 'unshielded';

export type MidnightTokenKind = 'shielded' | 'unshielded';

export type MidnightSpecificTokenMetadata = {
  kind: MidnightTokenKind;
  coins?: MidnightCoinDetail[];
};

export type RolesMap = typeof Roles;

export type DerivationPath<RoleName extends keyof RolesMap> = {
  accountIndex: number;
  index: number;
  role: RolesMap[RoleName];
};

type KeyData<RoleName extends keyof RolesMap> = {
  derivationPath: DerivationPath<RoleName>;
  encryptedKey: HexBytes;
};

export type MidnightKeysData = {
  dustKey: KeyData<'Dust'>;
  nightExternalKey: KeyData<'NightExternal'>;
  zswapKey: KeyData<'Zswap'>;
};

export type MidnightAccountProps = MidnightKeysData & {
  accountIndex: number;
  networkId: MidnightSDKNetworkId;
};

export type MidnightSpecificInMemoryWalletData = {
  encryptedSeed: HexBytes;
};

export type MidnightWalletSerialisedState = {
  dust: HexBytes;
  shielded: HexBytes;
  unshielded: HexBytes;
  unshieldedTxHistory: HexBytes;
};

export type MidnightWalletAddress = {
  shielded: MidnightShieldedAddress;
  unshielded: MidnightUnshieldedAddress;
  dust: MidnightDustAddress;
};

type MidnightWalletSyncProgress = {
  dust: Percent;
  shielded: Percent;
  unshielded: Percent;
  isStrictlyComplete: {
    dust: boolean;
    shielded: boolean;
    unshielded: boolean;
  };
};

export type CoinStatus = 'available' | 'pending';

export type MidnightCoinDetail = {
  status: CoinStatus;
  value: BigNumber;
  registeredForDustGeneration?: boolean;
  ownerAddress?: string;
};

export type CoinsByTokenType = Record<RawTokenType, MidnightCoinDetail[]>;

type ObservableMidnightWalletCoinsByTokenType = {
  shielded: CoinsByTokenType;
  unshielded: CoinsByTokenType;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
type SkipLastParameter<Function_ extends (...args: any[]) => any> = (
  ...params: Parameters<Function_> extends [...infer First, any] ? First : never
) => ReturnType<Function_>;

type KeepOnlyFirstParameter<Function_ extends (...args: any[]) => any> = (
  ...params: Parameters<Function_> extends [infer First, ...any[]]
    ? [First]
    : never
) => ReturnType<Function_>;

type SkipSecondParameter<Function_ extends (...args: any[]) => any> = (
  ...params: Parameters<Function_> extends [infer First, any, ...infer Rest]
    ? [First, ...Rest]
    : never
) => ReturnType<Function_>;

type SkipSecondAndThirdParameters<Function_ extends (...args: any[]) => any> = (
  ...params: Parameters<Function_> extends [
    infer First,
    any,
    any,
    ...infer Rest,
  ]
    ? [First, ...Rest]
    : never
) => ReturnType<Function_>;

type SkipThirdParameter<Function_ extends (...args: any[]) => any> = (
  ...params: Parameters<Function_> extends [
    infer First,
    infer Second,
    any,
    ...infer Rest,
  ]
    ? [First, Second, ...Rest]
    : never
) => ReturnType<Function_>;
/* eslint-enable @typescript-eslint/no-explicit-any */

export type ObservableWalletFacade = MakePropertiesObservable<
  Pick<
    WalletFacade,
    | 'calculateTransactionFee'
    | 'finalizeRecipe'
    | 'finalizeTransaction'
    | 'state'
    | 'stop'
    | 'submitTransaction'
  > & {
    balanceFinalizedTransaction: SkipSecondParameter<
      WalletFacade['balanceFinalizedTransaction']
    >;
    balanceUnboundTransaction: SkipSecondParameter<
      WalletFacade['balanceUnboundTransaction']
    >;
    balanceUnprovenTransaction: SkipSecondParameter<
      WalletFacade['balanceUnprovenTransaction']
    >;
    deregisterFromDustGeneration: KeepOnlyFirstParameter<
      WalletFacade['deregisterFromDustGeneration']
    >;
    estimateTransactionFee: SkipSecondParameter<
      WalletFacade['estimateTransactionFee']
    >;
    registerNightUtxosForDustGeneration: SkipSecondAndThirdParameters<
      WalletFacade['registerNightUtxosForDustGeneration']
    >;
    signRecipe: KeepOnlyFirstParameter<WalletFacade['signRecipe']>;
    signUnprovenTransaction: SkipLastParameter<
      WalletFacade['signUnprovenTransaction']
    >;
    transferTransaction: SkipSecondParameter<
      WalletFacade['transferTransaction']
    >;
    initSwap: SkipThirdParameter<WalletFacade['initSwap']>;
  }
>;

export type MidnightWallet = ObservableWalletFacade & {
  accountId: MidnightAccountId;
  address$: Observable<MidnightWalletAddress>;
  areKeysAvailable$: Observable<boolean>;
  coinsByTokenType$: Observable<ObservableMidnightWalletCoinsByTokenType>;
  getTransactionHistoryEntryByHash: (
    hash: string,
  ) => Observable<TransactionHistoryEntry | undefined>;
  networkId: MidnightSDKNetworkId;
  nightVerifyingKey: SignatureVerifyingKey;
  signData: (
    data: Uint8Array,
  ) => Observable<{ signature: string; verifyingKey: string }>;
  syncProgress$: Observable<MidnightWalletSyncProgress>;
  transactionHistory$: Observable<readonly TransactionHistoryEntry[]>;
  walletId: WalletId;
};

export type SerializedMidnightWallet = AccountRef & {
  networkId: MidnightSDKNetworkId;
  serializedState: MidnightWalletSerialisedState;
};

export type AccountKeys = {
  unshieldedKeystore: UnshieldedKeystore;
  walletKeys: {
    dustKeyBuffer: ByteArray;
    zswapKeyBuffer: ByteArray;
    /**
     * Pre-computed dust secret key from dustKeyBuffer.
     * Avoids repeated DustSecretKey.fromSeed() calls.
     */
    dustSecretKey: DustSecretKey;
    /**
     * Pre-computed zswap secret keys from zswapKeyBuffer.
     * Avoids repeated ZswapSecretKeys.fromSeed() calls during sync.
     */
    zswapSecretKeys: ZswapSecretKeys;
  };
  /**
   * Clears all sensitive key data from memory by filling buffers with zeros
   * and calling clear() on ledger key objects.
   * Should be called when keys are no longer needed (e.g., on idle timeout).
   * Implementers must clear all key buffers including the night secret key.
   */
  clear: () => void;
};

export type AccountKeyManager = {
  // a hot observable that keeps track of account keys.
  // - emit then on subscription immediatelly when available
  // - request password and decrypt the keys when not available
  // - clear from memory when there are no subscriptions for a while
  keys$: Observable<AccountKeys>;
  areKeysAvailable$: Observable<boolean>;
  /**
   * Destroys the key manager, clearing cached keys and completing all observables.
   * Should be called when the account is untracked to prevent memory leaks.
   */
  destroy: () => void;
};

export type StartMidnightAccountWalletParams = {
  config: MidnightNetworkConfig;
  store: CollectionStorage<SerializedMidnightWallet>;
  account: InMemoryWalletAccount<MidnightAccountProps>;
  keyManager: AccountKeyManager;
};

export type MidnightSideEffectsDependencies = {
  midnightWallets$: Observable<MidnightWalletsByAccountId>;
  getMidnightWalletByAccountId: (
    accountId: AccountId,
  ) => Observable<MidnightWallet>;
  stopAllMidnightWallets: () => Observable<void>;
  stopMidnightWallet: (accountId: AccountId) => Observable<void>;
  startMidnightAccountWallet: (
    params: StartMidnightAccountWalletParams,
  ) => Observable<MidnightWallet>;
};

export type MidnightSpecificSendFlowType = 'dust-designation' | 'send';

export type MidnightSpecificSendFlowData = {
  flowType?: MidnightSpecificSendFlowType;
};

export type MidnightSpecificReceiveFlowData = {
  networkId: MidnightSDKNetworkId;
};

export type MidnightNetwork = {
  networkId: MidnightSDKNetworkId;
  config: MidnightNetworkConfig;
};
