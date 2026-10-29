import {
  AccountCreationPendingError,
  CeremonyCancelledError,
  CreationLockMismatchError,
  DeviceReaderInvalidError,
  DeviceRosterInvalidError,
  EncryptionKeyMismatchError,
  GrantRevocationPendingError,
  MaintenanceAuthorityMismatchError,
  MaintenanceUpdateRefusedError,
  OperationNotInstallableError,
  PrfUnsupportedError,
  RecordCorruptedError,
  RecordUnreadableError,
} from '@lace-contract/passport';
import { RemoteSignerError } from '@lace-lib/passkey';

import type { SignerClient, SignerRequestPayloads } from '@lace-lib/passkey';

/** The part of the signer client the remote seams need. */
export type SignerRequester = Pick<SignerClient, 'request'>;

const PASSPORT_ERRORS: Record<
  string,
  ((error: RemoteSignerError) => Error) | undefined
> = {
  'account-creation-pending': ({ message }) =>
    new AccountCreationPendingError(message),
  'ceremony-cancelled': () => new CeremonyCancelledError(),
  'creation-lock-mismatch': ({ message }) =>
    new CreationLockMismatchError(message),
  'prf-unsupported': () => new PrfUnsupportedError(),
  'record-corrupted': () => new RecordCorruptedError(),
  'record-unreadable': () => new RecordUnreadableError(),
  'encryption-key-mismatch': ({ message }) =>
    new EncryptionKeyMismatchError(message),
  'device-reader-invalid': ({ message }) =>
    new DeviceReaderInvalidError(message),
  'device-roster-invalid': ({ message }) =>
    new DeviceRosterInvalidError(message),
  'grant-revocation-pending': ({ message }) =>
    new GrantRevocationPendingError(message),
  'maintenance-authority-mismatch': ({ message }) =>
    new MaintenanceAuthorityMismatchError(message),
  'maintenance-update-refused': ({ message }) =>
    new MaintenanceUpdateRefusedError(message),
  'operation-not-installable': ({ message }) =>
    new OperationNotInstallableError(message),
};

/**
 * Sends one request to the signer. A failure whose code names a Passport
 * error rejects with that error, so the flows see the same classes over
 * the channel as over a local ceremony. The signer's failure stays
 * attached as the cause. Any other failure rejects unchanged.
 */
export const requestSigner = async <Kind extends keyof SignerRequestPayloads>(
  client: SignerRequester,
  kind: Kind,
  payload: SignerRequestPayloads[Kind],
): Promise<unknown> => {
  try {
    return await client.request(kind, payload);
  } catch (error) {
    if (!(error instanceof RemoteSignerError)) throw error;
    const toPassportError = PASSPORT_ERRORS[error.code];
    if (!toPassportError) throw error;
    throw Object.assign(toPassportError(error), { cause: error });
  }
};
