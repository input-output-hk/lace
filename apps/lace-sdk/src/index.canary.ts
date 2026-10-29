/**
 * The root entry of the canary build: the stable entry plus the preview
 * exports (ADR 66), the Bitcoin modules, feature flags, networks, lazy vault
 * and transaction helpers. Experimental features are in experimental.canary.ts.
 */
export * from './index';

// The root entry's modules gain the Bitcoin modules.
export * as m from './modules';

export * from './bitcoin/bitcoin-config';
export {
  BitcoinTxBuildError,
  BitcoinTxBuildErrorCode,
} from '@lace-module/blockchain-bitcoin/sdk';
export { createBitcoinLazyInMemoryVaultModule } from './bitcoin/create-bitcoin-lazy-in-memory-vault-module';
export type { CreateBitcoinLazyInMemoryVaultModuleProps } from './bitcoin/create-bitcoin-lazy-in-memory-vault-module';
export {
  buildBitcoinTx,
  waitForBitcoinAccountSync,
} from './bitcoin/build-bitcoin-tx';
export type {
  BitcoinFeeRate,
  BitcoinRecipient,
  BuildBitcoinTxProps,
  UnsignedBitcoinTx,
  WalletWithBitcoinTxBuilding,
} from './bitcoin/build-bitcoin-tx';
export { signBitcoinTx } from './bitcoin/sign-bitcoin-tx';
export type {
  SignBitcoinTxProps,
  WalletWithBitcoinSigning,
} from './bitcoin/sign-bitcoin-tx';
export type { BitcoinSignResult } from '@lace-contract/bitcoin-context';
export { submitBitcoinTx } from './bitcoin/submit-bitcoin-tx';
export type {
  SubmitBitcoinTxProps,
  WalletWithBitcoinSubmit,
} from './bitcoin/submit-bitcoin-tx';
