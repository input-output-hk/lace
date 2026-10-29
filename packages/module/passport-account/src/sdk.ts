import './augmentations';

export { createPassportAccountModule } from './create-passport-account-module';
export type { CreatePassportAccountModuleProps } from './create-passport-account-module';
export { createPasskeyAuthoriser } from './ceremony/passkey';
export { createPasskeyEncryptionKey } from './ceremony/encryption-key';
export type { PasskeyEncryptionKey } from './ceremony/encryption-key';
export type {
  CreatePasskeyAuthoriserProps,
  PasskeyAuthoriser,
} from './ceremony/passkey';
export type { JubjubAuthoriser } from './acc/jubjub-authoriser';
export { createRemotePassportAuthoriser } from './remote/remote-authoriser';
export { createRemoteEncryptionKey } from './remote/remote-encryption-key';
export { createRemoteAccountRecordStore } from './remote/remote-account-records';
export type { AccountRecordStore } from './store/account-record';
export type {
  PassportAccountRecord,
  RecordPresence,
  StoredGrant,
  StoredGrantObject,
  StoredGrants,
  StoredGrantView,
} from './flows/types';
export type {
  AuthorityKey,
  AuthorityKeyKind,
  PendingCreationMarker,
  PendingDeployment,
} from './acc/pending-deployment';
export { createPassportSignerHandlers } from './remote/signer-handlers';
export type {
  CreatePassportSignerHandlersProps,
  PassportSignerHandlers,
} from './remote/signer-handlers';
export { decodeSignerFlow } from './remote/flow-descriptor';
export type { DecodedSignerFlow } from './remote/flow-descriptor';
export { MalformedPayloadError } from './remote/codec';
export {
  assertIssueRules,
  circuitScope,
  granteePoint,
} from './acc/grant-rules';
export type { GrantCircuitScope } from './acc/grant-rules';
export { loadGrantDerivation, loadGrantSpend } from './acc/signing-loader';
export type { GrantDerivation } from './acc/signing-loader';
export { grantSpendAuthorisationArgs } from './acc/grant-spend-authorisation';
export type { GrantSpendSignature } from './acc/grant-spend-authorisation';
export type {
  GrantShieldedWithdrawal,
  GrantSpendChallenges,
  GrantSpendCoin,
  GrantSpendContext,
  GrantSpendJubjubChallenge,
  GrantUnshieldedWithdrawal,
} from './acc/grant-spend-challenges';
export type { GrantSpend, GrantSpendCall } from './acc/grant-spend';
export { createPasskeySessionKeySource } from '@lace-lib/passkey';
export type {
  CreatePasskeyKeySourceProps,
  PasskeyCredentialRef,
  PasskeySessionKeySource,
} from '@lace-lib/passkey';
export { devEncryptionKey } from './acc/dev-encryption-key';
export { createDevDeposit } from './infra/dev-deposit';
export { createDevSponsor } from './infra/dev-sponsor';
export type {
  DevDeposit,
  DevDepositConfig,
  DevDepositRequest,
  DevDepositResult,
} from './infra/dev-deposit';
export type {
  DevSponsor,
  DevSponsorConfig,
  DevTokenKind,
  SponsorBalanceOptions,
  SponsorWallet,
  SponsorWalletContext,
} from './infra/dev-sponsor';
export type { Sleep } from './infra/submit';
export { createHttpProver } from './infra/http-prover';
export type {
  HttpProverOptions,
  KeyMaterialResolver,
  ProverFetch,
} from './infra/http-prover';
export type { FetchBytes } from './acc/artefact-loader';
export { midnightDevnetNetwork } from './infra/networks';
export type { MidnightDevnetNetworkProps } from './infra/networks';
