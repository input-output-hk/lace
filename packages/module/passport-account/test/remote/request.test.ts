import {
  AccountCreationPendingError,
  CeremonyCancelledError,
  CreationLockMismatchError,
  DeviceReaderInvalidError,
  EncryptionKeyMismatchError,
  GrantRevocationPendingError,
  MaintenanceAuthorityMismatchError,
  MaintenanceUpdateRefusedError,
  OperationNotInstallableError,
  PrfUnsupportedError,
  RecordCorruptedError,
  RecordUnreadableError,
} from '@lace-contract/passport';
import { RemoteSignerError, SignerClosedError } from '@lace-lib/passkey';
import { describe, expect, it, vi } from 'vitest';

import { requestSigner } from '../../src/remote/request';

const failingClient = (error: unknown) => ({
  request: vi.fn(async () => {
    throw error;
  }),
});

describe('requestSigner', () => {
  it('resolves with the result of the request it forwards', async () => {
    const client = { request: vi.fn(async () => 'answer') };

    await expect(
      requestSigner(client, 'reader-public-key', {
        networkId: 'undeployed',
      }),
    ).resolves.toBe('answer');
    expect(client.request).toHaveBeenCalledExactlyOnceWith(
      'reader-public-key',
      { networkId: 'undeployed' },
    );
  });

  it.each([
    ['ceremony-cancelled', CeremonyCancelledError],
    ['prf-unsupported', PrfUnsupportedError],
    ['record-corrupted', RecordCorruptedError],
    ['record-unreadable', RecordUnreadableError],
  ])('maps the %s code onto its Passport error', async (code, errorClass) => {
    const failure = new RemoteSignerError(code, 'signer said no');

    const rejection = requestSigner(failingClient(failure), 'record-read', {});

    await expect(rejection).rejects.toBeInstanceOf(errorClass);
    await expect(rejection).rejects.toMatchObject({ code, cause: failure });
  });

  it.each([
    ['encryption-key-mismatch', EncryptionKeyMismatchError],
    ['device-reader-invalid', DeviceReaderInvalidError],
    ['account-creation-pending', AccountCreationPendingError],
    ['creation-lock-mismatch', CreationLockMismatchError],
    ['grant-revocation-pending', GrantRevocationPendingError],
    ['maintenance-authority-mismatch', MaintenanceAuthorityMismatchError],
    ['maintenance-update-refused', MaintenanceUpdateRefusedError],
    ['operation-not-installable', OperationNotInstallableError],
  ])(
    'maps the %s code onto its Passport error, keeping the signer message',
    async (code, errorClass) => {
      const failure = new RemoteSignerError(code, 'the signer explains');

      const rejection = requestSigner(
        failingClient(failure),
        'record-read',
        {},
      );

      await expect(rejection).rejects.toBeInstanceOf(errorClass);
      await expect(rejection).rejects.toMatchObject({
        code,
        message: 'the signer explains',
        cause: failure,
      });
    },
  );

  it('rethrows a remote failure with a code the module does not know', async () => {
    const failure = new RemoteSignerError('signer-busy', 'busy');

    await expect(
      requestSigner(failingClient(failure), 'record-read', {}),
    ).rejects.toBe(failure);
  });

  it('rethrows a failure that is not a remote signer error', async () => {
    const failure = new SignerClosedError();

    await expect(
      requestSigner(failingClient(failure), 'record-read', {}),
    ).rejects.toBe(failure);
  });
});
