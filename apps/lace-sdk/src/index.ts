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
} from '@lace-contract/module';
export type { AppConfig } from '@lace-contract/module';

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

// Wallet types
export { WalletType } from '@lace-contract/wallet-repo';

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

// Cardano chain IDs
export { Cardano } from '@cardano-sdk/core';

// Module maps (re-exported as namespace for single-entrypoint bundling)
export * as m from './modules';
