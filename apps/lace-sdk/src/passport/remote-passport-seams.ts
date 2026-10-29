import {
  createRemoteAccountRecordStore,
  createRemoteEncryptionKey,
  createRemotePassportAuthoriser,
} from '@lace-module/passport-account/sdk';

import type { RemotePasskeySigner } from '../remote-passkey-signer';
import type {
  PassportAuthoriser,
  PassportEncryptionKey,
} from '@lace-contract/passport';
import type { AccountRecordStore } from '@lace-module/passport-account/sdk';

/**
 * The seams `createPassportAccountModule` takes, served by the hosted Lace
 * signer page over a signer's connection.
 */
export type RemotePassportSeams = {
  /** Signs Passport device operations through the signer's key session. */
  authoriser: PassportAuthoriser;
  /**
   * Resolves the account's public encryption key; the secret stays with
   * the signer.
   */
  encryptionKey: PassportEncryptionKey;
  /** Reads and writes the sealed Passport account record on the signer origin. */
  accountRecordStore: AccountRecordStore;
};

/**
 * Creates the Passport seams `authoriser`, `encryptionKey` and
 * `accountRecordStore` over the connection of a `createRemotePasskeySigner`
 * signer, to pass straight to `createPassportAccountModule`.
 *
 * The dApp persists nothing about the Passport account: the sealed record
 * lives on the signer origin behind `accountRecordStore`. One Approve click
 * opens a whole Passport flow session, and its assertion serves every
 * authoriser call made within that session; each Cardano signature through
 * the same signer is still its own Approve click and its own fresh
 * assertion.
 *
 * @param signer - The signer whose connection carries the requests; open
 *   and connect it as usual.
 */
export const createRemotePassportSeams = (
  signer: Pick<RemotePasskeySigner, 'request'>,
): RemotePassportSeams => ({
  authoriser: createRemotePassportAuthoriser(signer),
  encryptionKey: createRemoteEncryptionKey(signer),
  accountRecordStore: createRemoteAccountRecordStore(signer),
});
