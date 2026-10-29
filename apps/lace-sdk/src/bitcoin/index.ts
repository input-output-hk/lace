/**
 * The canary Bitcoin exports (ADR 66): everything a consumer needs to create a
 * wallet that loads the Bitcoin modules, from the Bitcoin entry alone. The
 * canary root entry adds the Bitcoin-specific ones to its own.
 */
export { createLaceWallet } from '../create-lace-wallet';
export type {
  LaceWallet,
  CreateLaceWalletProps,
  DispatchFunction,
} from '../create-lace-wallet';
export { createInMemoryWalletEntity } from '../create-in-memory-wallet-entity';
export type { CreateInMemoryWalletEntityProps } from '../create-in-memory-wallet-entity';
export { AccountId, WalletId, WalletType } from '@lace-contract/wallet-repo';
export { FEATURE_FLAG_NETWORK_TYPE } from '@lace-contract/network';
export type { AppConfig } from '@lace-contract/module';
export { Milliseconds } from '@lace-lib/util';
export type { Result } from '@lace-lib/util';
export * from './bitcoin-config';
export * as m from './modules';
export { createBitcoinLazyInMemoryVaultModule } from './create-bitcoin-lazy-in-memory-vault-module';
export type { CreateBitcoinLazyInMemoryVaultModuleProps } from './create-bitcoin-lazy-in-memory-vault-module';
export type { WithMnemonicWords } from '../cardano-lazy-in-memory-signer-factory';
export { LazyWalletMismatchError } from '../lazy-wallet-mismatch-error';
export {
  BitcoinTxBuildError,
  BitcoinTxBuildErrorCode,
} from '@lace-module/blockchain-bitcoin/sdk';
export { buildBitcoinTx, waitForBitcoinAccountSync } from './build-bitcoin-tx';
export type {
  BitcoinFeeRate,
  BitcoinRecipient,
  BuildBitcoinTxProps,
  UnsignedBitcoinTx,
  WalletWithBitcoinTxBuilding,
} from './build-bitcoin-tx';
export { signBitcoinTx } from './sign-bitcoin-tx';
export type {
  SignBitcoinTxProps,
  WalletWithBitcoinSigning,
} from './sign-bitcoin-tx';
export type { BitcoinSignResult } from '@lace-contract/bitcoin-context';
export { submitBitcoinTx } from './submit-bitcoin-tx';
export type {
  SubmitBitcoinTxProps,
  WalletWithBitcoinSubmit,
} from './submit-bitcoin-tx';
export { HexBytes } from '@lace-lib/util';
