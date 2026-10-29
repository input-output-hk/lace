import { CustomError } from 'ts-custom-error';

/**
 * Thrown when the user cancels the passkey ceremony invoked to create or
 * authenticate with a Passport account.
 */
export class CeremonyCancelledError extends CustomError {
  public readonly code = 'ceremony-cancelled' as const;

  public constructor(message = 'The passkey ceremony was cancelled.') {
    super(message);
  }
}

/**
 * Thrown when the platform authenticator does not support the PRF
 * extension. Passport derives both its signing and storage keys from the
 * passkey's PRF output, so an authenticator without it cannot host an
 * account.
 */
export class PrfUnsupportedError extends CustomError {
  public readonly code = 'prf-unsupported' as const;

  public constructor(
    message = 'The platform authenticator does not support the PRF extension.',
  ) {
    super(message);
  }
}

/**
 * Thrown when the persisted account record cannot be opened: the sealed
 * envelope is malformed, was tampered with, or the storage key does not
 * match the one that sealed it.
 */
export class RecordCorruptedError extends CustomError {
  public readonly code = 'record-corrupted' as const;

  public constructor(
    message = 'The persisted account record could not be opened.',
  ) {
    super(message);
  }
}

/**
 * Thrown when a device removal would leave the account with no authorised
 * device, or would remove the device that authorises the removal. Mirrors
 * the guard the Account Custody Contract itself enforces, so it can be
 * surfaced before submitting a transaction.
 */
export class LastDeviceError extends CustomError {
  public readonly code = 'last-device' as const;

  public constructor(
    message = 'The last device on an account cannot be removed.',
  ) {
    super(message);
  }
}

/**
 * Thrown when the Account Custody Contract rejects the caller's
 * authorisation: an invalid signature, a malformed device key, or a caller
 * entry that is not live in the on-chain device set. This is the
 * security-relevant rejection; a probe that merely fails to locate an
 * entry raises {@link DeviceEntryNotFoundError} instead, and a removal
 * whose target entry is gone raises {@link RemovalTargetNotFoundError}.
 */
export class NotAuthorisedError extends CustomError {
  public readonly code = 'not-authorised' as const;

  public constructor(message = 'The account rejected the authorisation.') {
    super(message);
  }
}

/**
 * Thrown when the use-counter rescan finds no live entry for this device
 * within the probed windows. Ambiguous by construction: the device may not
 * be registered on the account (or was revoked), or its counter may have
 * moved beyond the probed window, which a synced passkey used heavily on
 * another device can reach between sign-ins here. Not a security event.
 */
export class DeviceEntryNotFoundError extends CustomError {
  public readonly code = 'device-entry-not-found' as const;

  public constructor(
    message = 'No live device entry was found within the probed counter windows.',
  ) {
    super(message);
  }
}

/**
 * Thrown when a device removal names an entry that is not in the on-chain
 * device set: the target's entry rolled to a new counter since the roster
 * was last synced, or the device was already removed. Not a security
 * event; a rescan refreshes the roster.
 */
export class RemovalTargetNotFoundError extends CustomError {
  public readonly code = 'removal-target-not-found' as const;

  public constructor(
    message = 'The device entry named for removal is not on the ledger.',
  ) {
    super(message);
  }
}

/**
 * Thrown when the fee sponsor cannot cover the fees for a sponsored
 * transaction, for example because its budget has been exhausted.
 */
export class SponsorExhaustedError extends CustomError {
  public readonly code = 'sponsor-exhausted' as const;

  public constructor(
    message = 'The fee sponsor could not cover this transaction.',
  ) {
    super(message);
  }
}

/**
 * Thrown when account creation finds a persisted account record already on
 * this device. The record is the only pointer to the deployed contract and
 * this build has no recovery path, so creating over it would orphan the
 * existing account; sign in recognises it instead.
 */
export class AccountExistsError extends CustomError {
  public readonly code = 'account-exists' as const;

  public constructor(
    message = 'A Passport account already exists on this device; sign in instead.',
  ) {
    super(message);
  }
}

/**
 * Thrown when signing in finds no persisted account record on this device.
 * A record whose address holds no live contract raises
 * {@link AccountContractMissingError}, and a sealed record the configured
 * authoriser cannot open raises {@link RecordUnreadableError}.
 */
export class AccountNotFoundError extends CustomError {
  public readonly code = 'account-not-found' as const;

  public constructor(message = 'No Passport account was found.') {
    super(message);
  }
}

/**
 * Thrown when an account creation is unfinished: sign-in finds the
 * contract deployed but not every verifier key wave landed, or the
 * initial device not yet activated, or a hosted signer refuses to resume
 * a creation another site started. Sign-in cannot finish a creation;
 * creating the account again on this device, from the site that started
 * it, resumes the deployment from where it stopped.
 */
export class AccountCreationPendingError extends CustomError {
  public readonly code = 'account-creation-pending' as const;

  public constructor(
    message = 'The Passport account on this device is not finished being created; resume the creation from the site that started it.',
  ) {
    super(message);
  }
}

/**
 * Thrown when the persisted account record names an address that holds no
 * live Account Custody Contract on chain: the contract is gone, or the
 * record belongs to a different network than the one queried.
 */
export class AccountContractMissingError extends CustomError {
  public readonly code = 'account-contract-missing' as const;

  public constructor(
    message = 'No live Account Custody Contract was found at the recorded address.',
  ) {
    super(message);
  }
}

/**
 * Thrown when none of the envelopes this device holds in the account's
 * inbox opens a secret deriving the `enc_key` the Account Custody
 * Contract advertises: the device was never handed the account keys, was
 * removed before the last rotation, or reads another network or another
 * account. Refusing at sign-in keeps the account from passing as
 * recognised until an entry fails to open.
 */
export class EncryptionKeyMismatchError extends CustomError {
  public readonly code = 'encryption-key-mismatch' as const;

  public constructor(
    message = 'The derived encryption key does not match the account contract enc_key.',
  ) {
    super(message);
  }
}

/**
 * Thrown when a sealed account record is present but the configured
 * authoriser provides no storage key to open it. A persistence
 * misconfiguration, not an absent account: pairing the authoriser that
 * sealed the record restores access.
 */
export class RecordUnreadableError extends CustomError {
  public readonly code = 'record-unreadable' as const;

  public constructor(
    message = 'A sealed account record exists but this authoriser provides no storage key to open it.',
  ) {
    super(message);
  }
}

/**
 * Thrown when an operation that needs a ready Passport account is invoked
 * without one: no account is in state, or the flow has not reached
 * 'ready'.
 */
export class NoAccountError extends CustomError {
  public readonly code = 'no-account' as const;

  public constructor(message = 'No ready Passport account is available.') {
    super(message);
  }
}

/**
 * Thrown when a downloaded proving artefact fails its integrity check,
 * for example a hash mismatch against the expected digest.
 */
export class ArtefactIntegrityError extends CustomError {
  public readonly code = 'artefact-integrity' as const;

  public constructor(
    message = 'The proving artefact failed its integrity check.',
  ) {
    super(message);
  }
}

/**
 * Thrown when an operation names a grant that is not in the Account
 * Custody Contract's grants map.
 */
export class GrantNotFoundError extends CustomError {
  public readonly code = 'grant-not-found' as const;

  public constructor(message = 'No grant with this identifier was found.') {
    super(message);
  }
}

/**
 * Thrown when a grant's opening is asked for but this client holds none:
 * the grant was issued by another client of the account, or before the
 * client kept the object fields of its grants. Only the issuing client
 * can export the policy of a grant.
 */
export class GrantOpeningUnavailableError extends CustomError {
  public readonly code = 'grant-opening-unavailable' as const;

  public constructor(
    message = 'This client holds no opening for the grant, so it cannot export its policy.',
  ) {
    super(message);
  }
}

/**
 * Thrown when issuing a grant would exceed the number of grants the
 * Account Custody Contract holds at once. Revoking a grant frees room.
 */
export class GrantLimitReachedError extends CustomError {
  public readonly code = 'grant-limit-reached' as const;

  public constructor(
    message = 'The account already holds the maximum number of grants.',
  ) {
    super(message);
  }
}

/**
 * Thrown when a requested grant scope breaks a rule, for example a cap
 * below the per-call cap, an expiry in the past, or a read grant without
 * an rp id. Raised before any transaction is built.
 */
export class GrantScopeInvalidError extends CustomError {
  public readonly code = 'grant-scope-invalid' as const;

  public constructor(message = 'The grant scope is not valid.') {
    super(message);
  }
}

/**
 * Thrown when a read grant or a device removal is requested but the
 * encryption key held here cannot share the viewing secret: the key opens
 * inbox entries but offers neither the re-encryption a rotation needs nor
 * the sealing a delegate receives the secret through, as a device-only
 * authoriser's does. Raised before any prompt.
 */
export class ReadUnavailableError extends CustomError {
  public readonly code = 'read-unavailable' as const;

  public constructor(
    message = 'The encryption key held here cannot share the viewing secret, so no read grant can be issued or revoked and no device removed.',
  ) {
    super(message);
  }
}

/**
 * Thrown when a device is enrolled with keys that cannot be its own: a
 * reader key that is not a canonical X25519 key of large order, a device
 * key that is not a compressed Jubjub point, or a device key whose first
 * entry on the account is not the commitment enrolled. Raised before any
 * prompt, so the account keys are never sealed to a reader that does not
 * belong to the enrolled device.
 */
export class DeviceReaderInvalidError extends CustomError {
  public readonly code = 'device-reader-invalid' as const;

  public constructor(
    message = 'The joining device keys do not match the enrolled device.',
  ) {
    super(message);
  }
}

/**
 * Thrown when the device roster changed underneath a rotation: a
 * registration the live roster key opens landed while the rotation ran,
 * as another device's enrolment does. The rotation refuses before
 * `enc_key` is replaced, so a device enrolled meanwhile is never left on
 * the old key; running it again seals to the roster as it now stands.
 * A hosted signer refuses with it too when a rotation names a reader the
 * roster does not register as named.
 */
export class DeviceRosterInvalidError extends CustomError {
  public readonly code = 'device-roster-invalid' as const;

  public constructor(
    message = 'The device roster of the account changed during the rotation.',
  ) {
    super(message);
  }
}

/**
 * Thrown when the Account Custody Contract rejects a grant issuance that
 * passed local validation, for example because the grant identifier is
 * already taken.
 */
export class GrantIssueRejectedError extends CustomError {
  public readonly code = 'grant-issue-rejected' as const;

  public constructor(message = 'The account rejected the grant.') {
    super(message);
  }
}

/**
 * Thrown when a revocation names a grant the Account Custody Contract
 * lists but no longer holds active: it was already revoked and stays in
 * the grants map as an inactive tombstone until its slot is reused or
 * every grant is revoked. Raised before any prompt when the roster shows
 * the grant inactive, and from the contract's own abort should the grant
 * be revoked elsewhere in between.
 */
export class GrantRevokedError extends CustomError {
  public readonly code = 'grant-revoked' as const;

  public constructor(message = 'The grant is already revoked.') {
    super(message);
  }
}

/**
 * Thrown when the hosted signer refuses to seal a viewing secret to a
 * read grant whose revocation it signed: it forgets the grantee's read key
 * as soon as it signs the revocation, since it cannot see whether the
 * revocation lands. A grant still live with this error has a revocation
 * that never landed, so it is revoked again rather than issued again.
 */
export class GrantRevocationPendingError extends CustomError {
  public readonly code = 'grant-revocation-pending' as const;

  public constructor(
    message = 'The revocation of this read grant was signed but has not landed, so no newer viewing secret is sealed to it.',
  ) {
    super(message);
  }
}

/**
 * Thrown when an agent prepares a spend its grant does not allow: an
 * operation outside the grant's scope, an amount above the per-call cap
 * or past the cumulative cap, a recipient the grant's pin does not admit,
 * a coin of another colour or above the grant's coin bound, or a policy
 * whose grant id does not derive from its own fields. Raised before
 * anything is signed, so the agent learns it before it submits a call
 * the contract would refuse.
 */
export class GrantSpendRefusedError extends CustomError {
  public readonly code = 'grant-spend-refused' as const;

  public constructor(message = 'The grant does not allow this spend.') {
    super(message);
  }
}

/**
 * Thrown when a grant is requested by a host that runs under no relying
 * party id. Every grant is bound to the origin of the host that issued it
 * through the grant id, so without one there is no id to issue under.
 * Raised before the chain is read.
 */
export class GrantOriginMissingError extends CustomError {
  public readonly code = 'grant-origin-missing' as const;

  public constructor(
    message = 'A relying party id is required to issue a grant; none was given to the module.',
  ) {
    super(message);
  }
}

/**
 * Thrown when the indexer never reflects a grant call the chain accepted
 * within the time the flow waits for it. The account record already
 * holds the call's bookkeeping, so a sign-in reads the roster back once
 * the indexer catches up.
 */
export class GrantRosterUnsettledError extends CustomError {
  public readonly code = 'grant-roster-unsettled' as const;

  public constructor(
    message = 'The grant roster never reflected the accepted call.',
  ) {
    super(message);
  }
}

/**
 * Thrown when an account deployment cannot be completed: the contract's
 * maintenance authority was retired before every verifier key wave
 * landed, so no update can install the missing operations. Unrecoverable:
 * the contract is left as it stands and a new account is the only way on.
 * An install of missing operations on a locked account, whose authority
 * was retired at creation, raises it too, before anything is signed.
 */
export class AuthorityRetiredError extends CustomError {
  public readonly code = 'authority-retired' as const;

  public constructor(
    message = 'The account retired its maintenance authority before every operation was installed.',
  ) {
    super(message);
  }
}

/**
 * Thrown when a creation resumes over an account the chain shows
 * activated with its deploy-time maintenance authority still live, whether
 * it chose to lock the account or to hand the authority to its devices.
 * The flow retires or hands over the authority before it activates, so
 * the deployment ran outside it; whoever holds the deploy-time key keeps
 * full custody of the account and may have installed verifier keys no
 * check has seen, and a new account is the safe way on.
 */
export class AuthorityNotRetiredError extends CustomError {
  public readonly code = 'authority-not-retired' as const;

  public constructor(
    message = 'The account was created to be locked, but its maintenance authority is still live.',
  ) {
    super(message);
  }
}

/**
 * Thrown when a creation resumes an unfinished one under another lock
 * choice than the one it was started with. The deployment carries out the
 * choice it recorded, so resuming under another would finish an account
 * other than the one asked for; the message names the recorded choice,
 * which a retry repeats to finish the creation.
 */
export class CreationLockMismatchError extends CustomError {
  public readonly code = 'creation-lock-mismatch' as const;

  public constructor(
    message = 'The unfinished account creation was started with another lock choice.',
  ) {
    super(message);
  }
}

/**
 * Thrown when a creation resumes an unfinished one started under other
 * pinned verifier keys than this build installs, or recorded without
 * naming them. Finishing it would leave the account with verifier keys of
 * two builds, which no proof of either satisfies, so it is refused before
 * any wave; a new account is the way on.
 */
export class CreationArtefactMismatchError extends CustomError {
  public readonly code = 'creation-artefact-mismatch' as const;

  public constructor(
    message = 'The unfinished account creation was started under other contract artefacts than this build installs.',
  ) {
    super(message);
  }
}

/**
 * Thrown when the contract's maintenance authority on chain is not the
 * one any roster key this device holds derives: the account is locked,
 * its authority was rotated by a roster this device was never handed, or
 * the keyring belongs to another account. Raised before anything is
 * signed. A resumed creation raises it too when the committee on chain is
 * neither the deploy-time key nor the successor the recorded creation
 * installs, refused before any wave.
 */
export class MaintenanceAuthorityMismatchError extends CustomError {
  public readonly code = 'maintenance-authority-mismatch' as const;

  public constructor(
    message = "No roster key this device holds derives the account's maintenance authority.",
  ) {
    super(message);
  }
}

/**
 * Thrown when a maintenance update asks for a change the encryption key
 * does not sign: a replace that installs any authority other than the one
 * the live roster key derives, a verifier key that is not the one pinned
 * for its operation or not in the deployed roster, or no change at all.
 * An install is refused before any key is opened, a replace before
 * anything is signed. A roster rotation over an account whose authority
 * is live raises it too when the encryption key signs no maintenance
 * update at all, as the authority could not follow the roster, and so
 * does an install of missing operations, before any prompt.
 */
export class MaintenanceUpdateRefusedError extends CustomError {
  public readonly code = 'maintenance-update-refused' as const;

  public constructor(
    message = 'The maintenance update asks for a change the encryption key does not sign.',
  ) {
    super(message);
  }
}

/**
 * Thrown when an install of missing operations names an operation it
 * cannot install, one outside the operation roster this build deploys,
 * such as a recovery circuit or another device arm, or names none at
 * all. Raised before any prompt, naming every such operation; nothing is
 * installed. An operation the account already holds a verifier key for
 * is skipped rather than refused.
 */
export class OperationNotInstallableError extends CustomError {
  public readonly code = 'operation-not-installable' as const;

  public constructor(
    message = 'The account cannot install the operations asked for.',
  ) {
    super(message);
  }
}
