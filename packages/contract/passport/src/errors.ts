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
 * Thrown when removing a device would leave the account with no
 * authorised device left. Mirrors the guard the Account Custody Contract
 * itself enforces, so it can be surfaced before submitting a transaction.
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
