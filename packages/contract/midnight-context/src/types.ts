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
  SerialisedWalletState,
} from './value-objects';
import type { Percent } from '@cardano-sdk/util';
import type { CollectionStorage } from '@lace-contract/storage';
import type {
  AccountId,
  AccountRef,
  InMemoryWalletAccount,
  WalletId,
} from '@lace-contract/wallet-repo';
import type {
  BigNumber,
  ByteArray,
  HexBytes,
  MakePropertiesObservable,
} from '@lace-lib/util';
import type { Serializable } from '@lace-lib/util-store';
import type { ProofCircuitProvider } from '@lace-lib/vendor/midnight-proof-servers';
import type { ProofActivity } from '@lace-lib/vendor/wasm-proof-backend';
import type {
  DustSecretKey,
  RawTokenType,
  SignatureVerifyingKey,
  ZswapSecretKeys,
} from '@midnight-ntwrk/ledger-v8';
import type { WalletEntry } from '@midnightntwrk/wallet-sdk';
import type { WalletFacade } from '@midnightntwrk/wallet-sdk/facade';
import type { Roles } from '@midnightntwrk/wallet-sdk/hd';
import type { UnshieldedKeystore } from '@midnightntwrk/wallet-sdk/unshielded';
import type { Observable } from 'rxjs';

export type { ProofActivity } from '@lace-lib/vendor/wasm-proof-backend';

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
export type MidnightAccountPublicKeys = {
  /** Hex-encoded ShieldedCoinPublicKey */
  coin: HexBytes;
  /** Hex-encoded ShieldedEncryptionPublicKey */
  encryption: HexBytes;
};

export type MidnightContextSliceState = {
  supportsWasmProver: boolean;
  defaultNetworksConfig: MidnightNetworksConfig;
  defaultTestNetNetworkId: MidnightSDKTestNetworkId;
  userNetworksConfigOverrides: PartialMidnightNetworksConfig;
  remoteProofServerAddress?: string;
  /** Provider/version-specific acknowledgement of the remote-proving UI notice. */
  proofServerDisclosureAcknowledgements?: Record<string, boolean>;
  isActivityPageHeaderBannerDismissed?: boolean;
  isPortfolioBannerDismissed?: boolean;
  supportedNetworksIds: MidnightSDKNetworkId[];
  /** Total generated dust per account — what the dust tank displays. */
  dustBalanceByAccount: Partial<Record<MidnightAccountId, BigNumber>>;
  /** The SPENDABLE subset of `dustBalanceByAccount`: a build moves the whole
   * dust coin it pays with into pending, so only this can fund a transfer. */
  dustAvailableByAccount: Partial<Record<MidnightAccountId, BigNumber>>;
  dustGenerationDetailsByAccount: Partial<
    Record<MidnightAccountId, Serializable<DustGenerationDetails>>
  >;
  publicKeysByAccount: Partial<
    Record<MidnightAccountId, MidnightAccountPublicKeys>
  >;
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

/** The blockchain-specific data of a Midnight account: its keys, index and network. */
export type MidnightAccountProps = MidnightKeysData & {
  accountIndex: number;
  networkId: MidnightSDKNetworkId;
};

export type MidnightSpecificInMemoryWalletData = {
  encryptedSeed: HexBytes;
};

/**
 * SDK-serialised wallet state. `SerialisedWalletState` carries the encoding:
 * verbatim SDK JSON, or legacy hex on profiles written before LW-14981.
 */
export type MidnightWalletSerialisedState = {
  dust: SerialisedWalletState;
  shielded: SerialisedWalletState;
  unshielded: SerialisedWalletState;
  /**
   * Serialized unified transaction history — the shielded, unshielded and dust
   * sections are merged into it by hash. Profiles created before the key was
   * renamed persist it under the legacy key `unshieldedTxHistory`.
   */
  txHistory: SerialisedWalletState;
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
    | 'finalizeTransaction'
    | 'revert'
    | 'state'
    | 'stop'
    | 'submitTransaction'
  > & {
    finalizeRecipe: (
      recipe: Parameters<WalletFacade['finalizeRecipe']>[0],
      onProgress?: (event: AttestationProgressEvent) => void,
    ) => ReturnType<WalletFacade['finalizeRecipe']>;
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

/** Both wallet and dApp circuits use the account's single selected backend. */
export type { ProofCircuitProvider } from '@lace-lib/vendor/midnight-proof-servers';

export type MidnightWallet = ObservableWalletFacade & {
  accountId: MidnightAccountId;
  address$: Observable<MidnightWalletAddress>;
  areKeysAvailable$: Observable<boolean>;
  coinsByTokenType$: Observable<ObservableMidnightWalletCoinsByTokenType>;
  getTransactionHistoryEntryByHash: (
    hash: string,
  ) => Observable<WalletEntry | undefined>;
  networkId: MidnightSDKNetworkId;
  nightVerifyingKey: SignatureVerifyingKey;
  proofCircuitProvider: ProofCircuitProvider;
  signData: (
    data: Uint8Array,
  ) => Observable<{ signature: string; verifyingKey: string }>;
  syncProgress$: Observable<MidnightWalletSyncProgress>;
  transactionHistory$: Observable<readonly WalletEntry[]>;
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

/** Provider-owned phase/check IDs. Temenos keeps its existing wire values. */
export type AttestationPhaseId = string;
export type AttestationCheckId = string;

export type AttestationCheckResult = {
  id: AttestationCheckId;
  /** Owning phase; absent on legacy Temenos events (verify-locally). */
  phase?: AttestationPhaseId;
  status: 'failed' | 'passed';
  detail?: string;
};

/** Diagnostic progress only; these events never authorize a proof operation. */
export type AttestationPhaseEvent = {
  type: 'phase';
  phase: AttestationPhaseId;
  status: 'completed' | 'failed' | 'started';
  detail?: string;
};

/** Diagnostic attestation/proving phases and checks; events do not authorize disclosure. */
export type AttestationProgressEvent =
  | AttestationPhaseEvent
  | { type: 'check'; check: AttestationCheckResult }
  | { type: 'reset'; steps: AttestationPhaseId[] };

export type SendProofProgressEvent =
  | { type: 'begin'; operationId: string; accountId: AccountId }
  | { type: 'progress'; operationId: string; event: AttestationProgressEvent };

export type AttestationStepStatus = 'done' | 'failed' | 'pending' | 'running';

export type AttestationProgressState = {
  operationId?: string;
  accountId?: AccountId;
  status: 'failed' | 'idle' | 'running' | 'succeeded';
  steps: Array<{
    id: AttestationPhaseId;
    status: AttestationStepStatus;
    detail?: string;
  }>;
  /** End-to-end wallet send stages, separate from provider attestation. */
  proofMaterialRequests?: number;
  transactionSteps?: Array<{ id: string; status: AttestationStepStatus }>;
  checks?: AttestationCheckResult[];
  failure?: {
    phase: AttestationPhaseId;
    checkId?: AttestationCheckResult['id'];
    detail?: string;
  };
};

export type StartMidnightAccountWalletParams = {
  /** Reads the Temenos ledger indexer URL, resolved afresh for each attestation run. */
  getTemenosLedgerIndexerUrl?: () => Promise<string>;
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
  wasmProofActivities$: Observable<ProofActivity[]>;
  dismissWasmProofActivity: (id: string) => void;
  /**
   * Wallet-send progress, tagged with operation ownership. Connector proof
   * requests never emit into this stream. Side effects only observe (ADR 19).
   */
  teeAttestationProgress$: Observable<SendProofProgressEvent>;
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
