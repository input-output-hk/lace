/**
 * Midnight SDK entrypoint: the engine without the app shell. Its chunks are
 * separate from the main and Cardano entries, and it imports the external
 * Midnight packages, which a consumer installs alongside the SDK.
 */
export { createLaceWallet } from './create-lace-wallet';
export type { LaceWallet, CreateLaceWalletProps } from './create-lace-wallet';
export { createInMemoryWalletEntity } from './create-in-memory-wallet-entity';
export type { CreateInMemoryWalletEntityProps } from './create-in-memory-wallet-entity';
export { createMidnightAccounts } from './create-midnight-accounts';
export type { CreateMidnightAccountsProps } from './create-midnight-accounts';
export { createPasskeyKeySource } from '@lace-lib/passkey';
export type {
  CreatePasskeyKeySourceProps,
  PasskeyCredentialRef,
  PasskeyKeySource,
} from '@lace-lib/passkey';
export {
  createMidnightModule,
  MIDNIGHT_LOCAL_PROOF_SERVER_URL,
  MIDNIGHT_PREVIEW_INDEXER_URL,
  MIDNIGHT_PREVIEW_NODE_URL,
  MIDNIGHT_PUBLIC_ENDPOINTS,
} from './midnight-module';
export type {
  CreateMidnightModuleProps,
  MidnightPublicEndpoints,
  MidnightPublicNetworkId,
} from './midnight-module';
export { createMidnightPasskeyWalletEntity } from './midnight-passkey-wallet-entity';
export type { CreateMidnightPasskeyWalletEntityProps } from './midnight-passkey-wallet-entity';
export { selectMidnightNetwork } from './select-midnight-network';
export type { WalletWithMidnightNetwork } from './select-midnight-network';
export { observeMidnightBalances } from './observe-midnight-balances';
export type { MidnightBalances } from './observe-midnight-balances';
export { buildMidnightTransfer } from './build-midnight-transfer';
export type {
  BuildMidnightTransferProps,
  MidnightTxRecipe,
} from './build-midnight-transfer';
export { buildMidnightTransfers } from './build-midnight-transfers';
export type { MidnightTransferBatch } from './build-midnight-transfers';
export { estimateMidnightFee } from './estimate-midnight-fee';
export type { MidnightFeeRequest } from './estimate-midnight-fee';
export { registerMidnightDust } from './register-midnight-dust';
export type { RegisterMidnightDustProps } from './register-midnight-dust';
export { signMidnightData } from './sign-midnight-data';
export type { SignMidnightDataProps } from './sign-midnight-data';
export type {
  Signature,
  SignDataOptions,
} from '@midnight-ntwrk/dapp-connector-api';
export { discardMidnightTx } from './discard-midnight-tx';
export type { DiscardMidnightTxProps } from './discard-midnight-tx';
export { signMidnightTx } from './sign-midnight-tx';
export type { SignMidnightTxProps } from './sign-midnight-tx';
export { proveMidnightTx } from './prove-midnight-tx';
export type {
  MidnightFinalizedTx,
  ProveMidnightTxProps,
} from './prove-midnight-tx';
export { submitMidnightTx } from './submit-midnight-tx';
export type { SubmitMidnightTxProps } from './submit-midnight-tx';
export type {
  MidnightAccountProps as MidnightAccountSelection,
  WalletWithMidnight,
} from './midnight-wallet';
export {
  MidnightAccountNotFoundError,
  MidnightNetworkNotConfiguredError,
  MidnightNothingToRegisterError,
  MidnightSubmitTimeoutError,
  MidnightWalletNotReadyError,
} from './midnight-errors';
export type { MidnightErrorCode } from './midnight-errors';
export { Err, Ok } from '@lace-lib/util';
export type { Result } from '@lace-lib/util';
export {
  FEATURE_FLAG_MIDNIGHT,
  FEATURE_FLAG_MIDNIGHT_UNSHIELDED,
} from '@lace-module/midnight-sync/sdk';
export type {
  MidnightNetworkConfigOverrides,
  MidnightSyncBatchUpdates,
} from '@lace-module/midnight-sync/sdk';
export { FEATURE_FLAG_NETWORK_TYPE } from '@lace-contract/network';
export type { BlockchainNetworkId } from '@lace-contract/network';
export type { AppConfig } from '@lace-contract/module';
export {
  MidnightSDKNetworkIds,
  MidnightAccountId,
  MidnightNetworkId,
  NIGHT_TOKEN_ID,
  isForbiddenTokenName,
  isTakenTokenName,
  isTokenFullNameValid,
  isTokenShortNameValid,
} from '@lace-contract/midnight-context';
export type {
  MidnightAccountProps,
  MidnightNetworkConfig,
  MidnightSDKNetworkId,
} from '@lace-contract/midnight-context';
export { AccountId, WalletId, WalletType } from '@lace-contract/wallet-repo';
export type { InMemoryWallet } from '@lace-contract/wallet-repo';
export * as m from './modules-midnight';

export { getMidnightProvingProvider } from './midnight-proving-provider';
export type { GetMidnightProvingProviderProps } from './midnight-proving-provider';
export type {
  KeyMaterialProvider,
  ProvingProvider,
} from '@midnight-ntwrk/dapp-connector-api';
export type { AttestationProgressEvent } from '@lace-contract/midnight-context';
export { createTemenosAttestedProver } from '@lace-module/midnight-sync/sdk';
export type {
  CreateAttestedProver,
  AttestedProverProvider,
  AttestedProvingSession,
  TemenosTrustRoots,
  TemenosVerifier,
} from '@lace-module/midnight-sync/sdk';
export {
  balanceMidnightSealedTransaction,
  balanceMidnightUnsealedTransaction,
  makeMidnightTransfer,
  makeMidnightIntent,
} from './midnight-connector-transactions';
export type {
  MidnightBalanceProps,
  MidnightMakeTransferProps,
  MidnightMakeIntentProps,
} from './midnight-connector-transactions';
export type {
  DesiredInput,
  DesiredOutput,
} from '@midnight-ntwrk/dapp-connector-api';
