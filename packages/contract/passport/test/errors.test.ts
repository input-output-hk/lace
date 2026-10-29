import { CustomError } from 'ts-custom-error';
import { describe, expect, it } from 'vitest';

import {
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
  GrantRevocationPendingError,
  GrantRevokedError,
  GrantRosterUnsettledError,
  GrantScopeInvalidError,
  GrantSpendRefusedError,
  LastDeviceError,
  MaintenanceAuthorityMismatchError,
  MaintenanceUpdateRefusedError,
  NoAccountError,
  NotAuthorisedError,
  OperationNotInstallableError,
  PrfUnsupportedError,
  ReadUnavailableError,
  RecordCorruptedError,
  RecordUnreadableError,
  RemovalTargetNotFoundError,
  SponsorExhaustedError,
} from '../src/errors';

describe('passport errors', () => {
  it.each([
    ['CeremonyCancelledError', CeremonyCancelledError, 'ceremony-cancelled'],
    ['PrfUnsupportedError', PrfUnsupportedError, 'prf-unsupported'],
    ['ReadUnavailableError', ReadUnavailableError, 'read-unavailable'],
    [
      'DeviceReaderInvalidError',
      DeviceReaderInvalidError,
      'device-reader-invalid',
    ],
    [
      'DeviceRosterInvalidError',
      DeviceRosterInvalidError,
      'device-roster-invalid',
    ],
    ['RecordCorruptedError', RecordCorruptedError, 'record-corrupted'],
    ['LastDeviceError', LastDeviceError, 'last-device'],
    ['NotAuthorisedError', NotAuthorisedError, 'not-authorised'],
    ['SponsorExhaustedError', SponsorExhaustedError, 'sponsor-exhausted'],
    ['AccountNotFoundError', AccountNotFoundError, 'account-not-found'],
    ['NoAccountError', NoAccountError, 'no-account'],
    ['ArtefactIntegrityError', ArtefactIntegrityError, 'artefact-integrity'],
    [
      'DeviceEntryNotFoundError',
      DeviceEntryNotFoundError,
      'device-entry-not-found',
    ],
    [
      'RemovalTargetNotFoundError',
      RemovalTargetNotFoundError,
      'removal-target-not-found',
    ],
    [
      'AccountContractMissingError',
      AccountContractMissingError,
      'account-contract-missing',
    ],
    ['RecordUnreadableError', RecordUnreadableError, 'record-unreadable'],
    ['AccountExistsError', AccountExistsError, 'account-exists'],
    ['GrantNotFoundError', GrantNotFoundError, 'grant-not-found'],
    [
      'GrantOpeningUnavailableError',
      GrantOpeningUnavailableError,
      'grant-opening-unavailable',
    ],
    ['GrantLimitReachedError', GrantLimitReachedError, 'grant-limit-reached'],
    ['GrantScopeInvalidError', GrantScopeInvalidError, 'grant-scope-invalid'],
    [
      'GrantIssueRejectedError',
      GrantIssueRejectedError,
      'grant-issue-rejected',
    ],
    ['GrantRevokedError', GrantRevokedError, 'grant-revoked'],
    ['GrantSpendRefusedError', GrantSpendRefusedError, 'grant-spend-refused'],
    [
      'GrantRevocationPendingError',
      GrantRevocationPendingError,
      'grant-revocation-pending',
    ],
    [
      'GrantOriginMissingError',
      GrantOriginMissingError,
      'grant-origin-missing',
    ],
    [
      'GrantRosterUnsettledError',
      GrantRosterUnsettledError,
      'grant-roster-unsettled',
    ],
    [
      'EncryptionKeyMismatchError',
      EncryptionKeyMismatchError,
      'encryption-key-mismatch',
    ],
    ['AuthorityRetiredError', AuthorityRetiredError, 'authority-retired'],
    [
      'AuthorityNotRetiredError',
      AuthorityNotRetiredError,
      'authority-not-retired',
    ],
    [
      'AccountCreationPendingError',
      AccountCreationPendingError,
      'account-creation-pending',
    ],
    [
      'CreationLockMismatchError',
      CreationLockMismatchError,
      'creation-lock-mismatch',
    ],
    [
      'CreationArtefactMismatchError',
      CreationArtefactMismatchError,
      'creation-artefact-mismatch',
    ],
    [
      'MaintenanceAuthorityMismatchError',
      MaintenanceAuthorityMismatchError,
      'maintenance-authority-mismatch',
    ],
    [
      'MaintenanceUpdateRefusedError',
      MaintenanceUpdateRefusedError,
      'maintenance-update-refused',
    ],
    [
      'OperationNotInstallableError',
      OperationNotInstallableError,
      'operation-not-installable',
    ],
  ] as const)(
    '%s has code %s and is a CustomError',
    (_name, ErrorClass, code) => {
      const error = new ErrorClass();
      expect(error).toBeInstanceOf(CustomError);
      expect(error).toBeInstanceOf(ErrorClass);
      expect(error.code).toBe(code);
    },
  );

  it('says a joining device keys mismatch the enrolled device by default', () => {
    expect(new DeviceReaderInvalidError().message).toBe(
      'The joining device keys do not match the enrolled device.',
    );
  });

  it('says the device roster changed during the rotation by default', () => {
    expect(new DeviceRosterInvalidError().message).toBe(
      'The device roster of the account changed during the rotation.',
    );
  });

  it('accepts a custom message', () => {
    const error = new NotAuthorisedError('replayed use counter');
    expect(error.message).toBe('replayed use counter');
    expect(error.code).toBe('not-authorised');
  });
});
