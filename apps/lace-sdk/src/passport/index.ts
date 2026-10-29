/**
 * Midnight Passport accounts: the Passport contract's exports, the seams over
 * a hosted signer, and the agent policy an agent acts under. An experimental
 * feature of the canary build (ADR 66), exported from the `experimental`
 * entry alone; the module factories are in `./modules`.
 */
export { createRemotePassportSeams } from './remote-passport-seams';
export type { RemotePassportSeams } from './remote-passport-seams';
export {
  passportStoreContract,
  passportDependencyContract,
  AccountContractMissingError,
  AccountCreationPendingError,
  AccountExistsError,
  AccountNotFoundError,
  ArtefactIntegrityError,
  AuthorityNotRetiredError,
  AuthorityRetiredError,
  CeremonyCancelledError,
  CreationArtefactMismatchError,
  CreationLockMismatchError,
  DeviceEntryNotFoundError,
  DeviceReaderInvalidError,
  DeviceRosterInvalidError,
  EncryptionKeyMismatchError,
  GrantIssueRejectedError,
  GrantLimitReachedError,
  GrantNotFoundError,
  GrantOpeningUnavailableError,
  GrantOriginMissingError,
  GrantRevokedError,
  GrantRosterUnsettledError,
  GrantScopeInvalidError,
  GrantSpendRefusedError,
  LastDeviceError,
  MaintenanceAuthorityMismatchError,
  MaintenanceUpdateRefusedError,
  MAX_GRANTS,
  NoAccountError,
  NotAuthorisedError,
  OperationNotInstallableError,
  PrfUnsupportedError,
  RecordCorruptedError,
  RecordUnreadableError,
  RemovalTargetNotFoundError,
  SponsorExhaustedError,
  TokenColor,
  TokenColorError,
  validateGrantScope,
} from '@lace-contract/passport';
export type * from '@lace-contract/passport';
export {
  exportPassportAgentPolicy,
  PASSPORT_AGENT_POLICY_VERSION,
} from './export-passport-agent-policy';
export type {
  ExportPassportAgentPolicyProps,
  PassportAgentPolicy,
  WalletWithPassport,
} from './export-passport-agent-policy';
export {
  parsePassportAgentPolicy,
  PassportAgentPolicyInvalidError,
} from './parse-passport-agent-policy';
export type { PassportParsedAgentPolicy } from './parse-passport-agent-policy';
export {
  loadPassportGrantSpendChallenges,
  preparePassportGrantSpend,
} from './prepare-passport-grant-spend';
export { grantSpendAuthorisationArgs } from '@lace-module/passport-account/sdk';
export type {
  GrantShieldedWithdrawal,
  GrantSpend,
  GrantSpendCall,
  GrantSpendChallenges,
  GrantSpendCoin,
  GrantSpendContext,
  GrantSpendJubjubChallenge,
  GrantSpendSignature,
  GrantUnshieldedWithdrawal,
} from '@lace-module/passport-account/sdk';
