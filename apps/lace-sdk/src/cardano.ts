/** The `./cardano` entry: the Cardano wallet API and the modules it runs on. */
export { createPasskeyKeySource } from '@lace-lib/passkey';

export { createLaceWallet } from './create-lace-wallet';
export type {
  LaceWallet,
  CreateLaceWalletProps,
  DispatchFunction,
} from './create-lace-wallet';
export { createInMemoryWalletEntity } from './create-in-memory-wallet-entity';
export type { CreateInMemoryWalletEntityProps } from './create-in-memory-wallet-entity';
export { createLazyInMemoryVaultModule } from './create-lazy-in-memory-vault-module';
export type { CreateLazyInMemoryVaultModuleProps } from './create-lazy-in-memory-vault-module';
export type { WithMnemonicWords } from './cardano-lazy-in-memory-signer-factory';
export { LazyWalletMismatchError } from './lazy-wallet-mismatch-error';
export type {
  CreatePasskeyKeySourceProps,
  PasskeyCredentialRef,
  PasskeyKeySource,
} from '@lace-lib/passkey';
export { createPasskeyVaultModule } from './passkey-vault-module';
export { createPasskeyWalletEntity } from './passkey-wallet-entity';
export type {
  CreatePasskeyWalletEntityProps,
  PasskeyWalletBinding,
} from './passkey-wallet-entity';
export { PasskeyWalletMismatchError } from './passkey-wallet-mismatch-error';
export {
  createSignerClient,
  RemoteSignerError,
  SignerClosedError,
  SignerPopupBlockedError,
} from '@lace-lib/passkey';
export type { CreateSignerClientProps, SignerClient } from '@lace-lib/passkey';
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
export { FEATURE_FLAG_CARDANO } from '@lace-contract/cardano-context';
export { FEATURE_FLAG_NETWORK_TYPE } from '@lace-contract/network';
export type { AppConfig } from '@lace-contract/module';
export { Cardano, Serialization } from '@cardano-sdk/core';
export { AccountId, WalletId, WalletType } from '@lace-contract/wallet-repo';
export { createTxBuilder, waitForNetworkInfo } from './create-tx-builder';
export type {
  CardanoContextObservables,
  NetworkInfo,
  WalletWithCardanoContext,
} from './create-tx-builder';
export { signCardanoTx } from './sign-cardano-tx';
export type {
  SignCardanoTxProps,
  WalletWithCardanoSigning,
} from './sign-cardano-tx';
export type { CardanoSignResult } from '@lace-contract/cardano-context';
export { submitCardanoTx } from './submit-cardano-tx';
export type {
  SubmitCardanoTxProps,
  WalletWithCardanoSubmit,
} from './submit-cardano-tx';
export { HexBlob } from '@cardano-sdk/util';
export { Milliseconds } from '@lace-lib/util';
export { HexBytes } from '@lace-lib/util';
export * as m from './modules-cardano';

// Swap provider (Steelswap + shared swap types), Cardano-only, so it
// belongs here as well as on the root entry.
export * from './swap';
