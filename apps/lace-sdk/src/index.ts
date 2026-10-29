// Value objects from @lace-lib/util
export {
  BigNumber,
  HexBytes,
  ByteArray,
  Uri,
  Milliseconds,
  Seconds,
  Minutes,
  Hours,
  Days,
  Timestamp,
  TimeSpan,
  Ok,
  Err,
} from '@lace-lib/util';
export type { Result } from '@lace-lib/util';

// Cryptographic value objects from @lace-lib/crypto
export { EntropyHex, Mnemonic } from '@lace-lib/crypto';

// Module utilities from @lace-contract/module: what an app needs to write
// its own modules and contracts. The runtime the wallet assembles them with
// stays internal; createLaceWallet runs it.
export {
  markParameterizedSelector,
  IS_PARAMETERIZED,
  assertModuleCompatibility,
  MultipleImplementationsError,
  MissingContractImplementationError,
  inferContractContext,
  inferModuleContext,
  inferStoreContext,
  combineContracts,
  ContractName,
  ModuleName,
} from '@lace-contract/module';
export type {
  Action,
  ActionObservables,
  ActionType,
  AddonContract,
  AddonContractType,
  AddonKey,
  AnyFunction,
  AnyLaceSideEffect,
  AnyParameterizedSelector,
  AnyParameteterlessSelector,
  AppConfig,
  ArrayType,
  ContextualDynamicallyLoadedInit,
  ContextualLaceInit,
  ContextualLoadableKey,
  ContextualModuleInitProps,
  Contract,
  ContractActionCreators,
  ContractSelectors,
  Contracts,
  ContractsActionCreators,
  ContractsSelectors,
  CreateKeyValueStorageProps,
  CreateLoaderProps,
  CreateStoreDependencies,
  CreateStoreProps,
  CreateStoreResult,
  DefaultSideEffectDependencies,
  DynamicallyLoaded,
  DynamicallyLoadedInit,
  EmptyObjectSymbol,
  Environment,
  KeyValueStorage,
  KeyValueStorageDependencies,
  KeyValueStorageFactory,
  LaceAddons,
  LaceInit,
  LaceInitSync,
  LaceModule,
  LaceModuleAddonNames,
  LaceModuleMap,
  LaceModuleMixin,
  LaceModuleStore,
  LaceModuleStoreInit,
  LacePersistConfig,
  LacePersistConfigMap,
  LacePlatform,
  LaceReduxObservableEpic,
  LaceSideEffect,
  LaceStoreContext,
  LoadResult,
  LoadableKey,
  LoadedActionCreators,
  LoadedSelectors,
  ModuleActionCreators,
  ModuleAddons,
  ModuleExports,
  ModuleInitDependencies,
  ModuleInitProps,
  ModuleLoader,
  ModuleSelectors,
  ModuleStoreActionCreators,
  ModuleStoreSelectors,
  ModuleValue,
  NonUndefinedPersistedState,
  OmitEmptyActionCreators,
  PersistedState,
  PersistedStateProperty,
  Runtime,
  ScopedActionCreators,
  ScopedSelectors,
  SideEffectDependencies,
  SideEffectDependencyContract,
  SideEffectDependencyContractType,
  SideEffectDependencyNames,
  State,
  StateObservables,
  StoreContract,
  StoreContractType,
  Values,
  WithLaceContext,
} from '@lace-contract/module';

// Storage contract
export {
  storageDependencyContract,
  DocumentStore,
  CollectionStore,
  KeyValueStore,
} from '@lace-contract/storage';
export type {
  CollectionStorage,
  CreateCollectionStorageProps,
  CreateDocumentStorageProps,
  DocumentStorage,
  StorageAdapter,
  StorageDependencies,
} from '@lace-contract/storage';

// Feature flags
export { FeatureFlagKey } from '@lace-contract/feature';
export type { FeatureFlag } from '@lace-contract/feature';
export { FEATURE_FLAG_CARDANO } from '@lace-contract/cardano-context';
export { FEATURE_FLAG_NETWORK_TYPE } from '@lace-contract/network';

// Headless wallet
export { createLaceWallet } from './create-lace-wallet';
export type {
  LaceWallet,
  CreateLaceWalletProps,
  DispatchFunction,
} from './create-lace-wallet';

// Wallet entity creation
export { createInMemoryWalletEntity } from './create-in-memory-wallet-entity';
export type { CreateInMemoryWalletEntityProps } from './create-in-memory-wallet-entity';

// Lazy in-memory vault (mnemonic scoped to each sign call, never persisted by Lace)
export { createLazyInMemoryVaultModule } from './create-lazy-in-memory-vault-module';
export type { CreateLazyInMemoryVaultModuleProps } from './create-lazy-in-memory-vault-module';
export type { WithMnemonicWords } from './cardano-lazy-in-memory-signer-factory';
export { LazyWalletMismatchError } from './lazy-wallet-mismatch-error';
export { createPasskeyVaultModule } from './passkey-vault-module';
export { createPasskeyWalletEntity } from './passkey-wallet-entity';
export { PasskeyWalletMismatchError } from './passkey-wallet-mismatch-error';
export type {
  PasskeyWalletBinding,
  CreatePasskeyWalletEntityProps,
} from './passkey-wallet-entity';
export {
  createPasskeyKeySource,
  createSignerClient,
  RemoteSignerError,
  SignerClosedError,
  SignerPopupBlockedError,
} from '@lace-lib/passkey';
export type {
  CreateSignerClientProps,
  PasskeyCredentialRef,
  PasskeyKeySource,
  SignerClient,
} from '@lace-lib/passkey';

// Remote Cardano vault (signatures produced by the Lace signer page)
export { createRemoteCardanoVaultModule } from './remote-cardano-vault-module';
export type { CreateRemoteCardanoVaultModuleProps } from './remote-cardano-vault-module';
export {
  CardanoRemoteSignerFactory,
  RemoteSignerResultError,
} from './cardano-remote-signer-factory';
export type {
  CardanoRemoteSignerFactoryProps,
  RemoteSignerRequester,
} from './cardano-remote-signer-factory';
export { createRemotePasskeySigner } from './remote-passkey-signer';
export type {
  CreateRemotePasskeySignerProps,
  RemotePasskeySigner,
} from './remote-passkey-signer';
export { createRemotePasskeyWalletEntity } from './remote-passkey-wallet-entity';
export type {
  CreateRemotePasskeyWalletEntityProps,
  RemotePasskeyWalletEntity,
} from './remote-passkey-wallet-entity';

// Wallet types
export { AccountId, WalletId, WalletType } from '@lace-contract/wallet-repo';
export type {
  AccountIdentityKey,
  AccountMetadata,
  AccountRef,
  ActiveAccountContext,
  AnyAccount,
  AnyWallet,
  BlockchainNetworks,
  BlockchainSpecificHardwareWalletData,
  BlockchainSpecificInMemoryWalletData,
  BlockchainSpecificMultiSigWalletData,
  HardwareKeystoneWalletId,
  HardwareSeedSignerWalletId,
  HardwareWallet,
  HardwareWalletAccount,
  HardwareWalletId,
  HardwareWalletKeystone,
  HardwareWalletLedger,
  HardwareWalletSeedSigner,
  HardwareWalletTrezor,
  InMemoryWallet,
  InMemoryWalletAccount,
  LazyInMemoryWallet,
  LazyInMemoryWalletAccount,
  MultiSigWallet,
  MultiSigWalletAccount,
  WalletEntity,
  WalletIdentity,
  WalletMetadata,
  WalletsState,
} from '@lace-contract/wallet-repo';

// Transaction building (simple, certificates, and Plutus smart contracts)
export { TransactionBuilder } from '@lace-contract/cardano-context';
export type {
  PlutusContext,
  ScriptInputProps,
} from '@lace-contract/cardano-context';
export { createTxBuilder, waitForNetworkInfo } from './create-tx-builder';
export type {
  CardanoContextObservables,
  NetworkInfo,
  WalletWithCardanoContext,
} from './create-tx-builder';

// Transaction signing
export { signCardanoTx } from './sign-cardano-tx';
export type {
  SignCardanoTxProps,
  WalletWithCardanoSigning,
} from './sign-cardano-tx';
export type { CardanoSignResult } from '@lace-contract/cardano-context';

// Transaction submission
export { submitCardanoTx } from './submit-cardano-tx';
export type {
  SubmitCardanoTxProps,
  WalletWithCardanoSubmit,
} from './submit-cardano-tx';

export { HexBlob } from '@cardano-sdk/util';

// Cardano chain IDs and CBOR serialization
export { Cardano, Serialization } from '@cardano-sdk/core';

// Swap provider (Steelswap + shared swap types)
export * from './swap';

// Blockfrost providers (Cardano chain reads + submit)
export * from './blockfrost';

// Branded address constructors / types (lace-platform brands, distinct
// from @cardano-sdk/core Cardano.* address types).
export * from './cardano-address-types';

export { AddressAlias, AddressAliasType } from '@lace-contract/addresses';
export type {
  Address,
  AddressAliasEntry,
  AddressAliasResolution,
  AddressAliasResolver,
  AddressesSliceState,
  AddressesStoreState,
  AnyAddress,
  AnyBlockchainAddress,
  UpsertAddressesPayload,
} from '@lace-contract/addresses';
export {
  FolderId,
  TokenId,
  TOKEN_FULL_NAME_MAX_LENGTH,
} from '@lace-contract/tokens';
export type {
  AccountTokensMap,
  Folder,
  GroupedTokens,
  MetadataByTokenId,
  MultiAccountsTokensMap,
  RawToken,
  RawTokenWithoutContext,
  RawTokensState,
  ResetAddressTokensPayload,
  SetAccountTokensPayload,
  SetTokensPayload,
  StoredTokenMetadata,
  Token,
  TokenContextData,
} from '@lace-contract/tokens';
export {
  ActivitiesPaginationFailureId,
  ActivityType,
  MAX_ACTIVITIES_PER_ACCOUNT,
} from '@lace-contract/activities';
export type {
  ActivitiesSliceState,
  ActivitiesStoreState,
  Activity,
  ActivityDetail,
  ActivityDetailsContentProps,
  ActivityTokenBalanceChange,
  BlockchainSpecificActivityMetadata,
  GetActivityTokenBalanceChange,
  GetActivityTokensInfoSummary,
  PendingActivitiesByAccount,
  RewardActivity,
  TokensInfoSummary,
} from '@lace-contract/activities';

// Provider error types (for structured slippage classification on submit)
export {
  ProviderError,
  ProviderFailure,
  TxSubmissionError,
  TxSubmissionErrorCode,
} from '@cardano-sdk/core';
export type { SubmitTxArgs, ValueNotConservedData } from '@cardano-sdk/core';

// Module maps (re-exported as namespace for single-entrypoint bundling)
export * as m from './modules-cardano';
