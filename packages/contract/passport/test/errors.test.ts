import { CustomError } from 'ts-custom-error';
import { describe, expect, it } from 'vitest';

import {
  AccountContractMissingError,
  AccountExistsError,
  AccountNotFoundError,
  ArtefactIntegrityError,
  CeremonyCancelledError,
  DeviceEntryNotFoundError,
  LastDeviceError,
  NoAccountError,
  NotAuthorisedError,
  PrfUnsupportedError,
  RecordCorruptedError,
  RecordUnreadableError,
  RemovalTargetNotFoundError,
  SponsorExhaustedError,
} from '../src/errors';

describe('passport errors', () => {
  it.each([
    ['CeremonyCancelledError', CeremonyCancelledError, 'ceremony-cancelled'],
    ['PrfUnsupportedError', PrfUnsupportedError, 'prf-unsupported'],
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
  ] as const)(
    '%s has code %s and is a CustomError',
    (_name, ErrorClass, code) => {
      const error = new ErrorClass();
      expect(error).toBeInstanceOf(CustomError);
      expect(error).toBeInstanceOf(ErrorClass);
      expect(error.code).toBe(code);
    },
  );

  it('accepts a custom message', () => {
    const error = new NotAuthorisedError('replayed use counter');
    expect(error.message).toBe('replayed use counter');
    expect(error.code).toBe('not-authorised');
  });
});
