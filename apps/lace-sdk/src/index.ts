// Value objects from @lace-sdk/util
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
} from '@lace-sdk/util';
export type { Result } from '@lace-sdk/util';

// Cryptographic value objects from @lace-lib/crypto
export { EntropyHex, Mnemonic } from '@lace-lib/crypto';

// Module utilities from @lace-contract/module
export {
  markParameterizedSelector,
  IS_PARAMETERIZED,
  assertModuleCompatibility,
  MultipleImplementationsError,
  MissingContractImplementationError,
  inferModuleContext,
  inferStoreContext,
  combineContracts,
  ModuleName,
} from '@lace-contract/module';
export type * from '@lace-contract/module';

// Storage contract
export {
  storageDependencyContract,
  DocumentStore,
  CollectionStore,
  KeyValueStore,
} from '@lace-contract/storage';
export type * from '@lace-contract/storage';

// Feature flags
export { FeatureFlagKey } from '@lace-contract/feature';
export type { FeatureFlag } from '@lace-contract/feature';
export { FEATURE_FLAG_CARDANO } from '@lace-contract/cardano-context';
export { FEATURE_FLAG_NETWORK_TYPE } from '@lace-contract/network';

// Headless wallet
export { createLaceWallet } from './create-lace-wallet';
export type { LaceWallet, CreateLaceWalletProps } from './create-lace-wallet';

// Wallet entity creation
export { createInMemoryWalletEntity } from './create-in-memory-wallet-entity';
export type { CreateInMemoryWalletEntityProps } from './create-in-memory-wallet-entity';

// Lazy in-memory vault (mnemonic fetched per sign call, never persisted by Lace)
export { createLazyInMemoryVaultModule } from './create-lazy-in-memory-vault-module';
export type { CreateLazyInMemoryVaultModuleProps } from './create-lazy-in-memory-vault-module';
export type { GetMnemonicWords } from './cardano-lazy-in-memory-signer-factory';

// Wallet types
export { AccountId, WalletId, WalletType } from '@lace-contract/wallet-repo';
export type * from '@lace-contract/wallet-repo';

// Transaction building
export { TransactionBuilder } from '@lace-contract/cardano-context';
export { createTxBuilder, waitForNetworkInfo } from './create-tx-builder';

// Transaction signing
export { signCardanoTx } from './sign-cardano-tx';
export type { SignCardanoTxProps } from './sign-cardano-tx';
export type { CardanoSignResult } from '@lace-contract/cardano-context';

// Transaction submission
export { submitCardanoTx } from './submit-cardano-tx';
export type { SubmitCardanoTxProps } from './submit-cardano-tx';

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
export * as m from './modules';
