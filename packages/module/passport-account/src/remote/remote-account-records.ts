import { defer, map } from 'rxjs';

import { decodePresence, decodeRecord } from './codec';
import { requestSigner } from './request';

import type { SignerRequester } from './request';
import type { AccountRecordStore } from '../store/account-record';

/**
 * An {@link AccountRecordStore} kept on the signer origin. The record
 * travels in the clear over the channel, and only inside a key session.
 * Once the account is complete it holds no secret, only the address that
 * names the account and the grant bookkeeping, of which the signer shows
 * and takes only what is kept under the asking origin. While a creation
 * is unfinished it carries the pending deployment with the contract's
 * maintenance authority key, which crosses only inside a create-account
 * session of the origin that started the creation, the dApp running the
 * waves holding it anyway; any other flow reads only the creation's key
 * entries and cannot change the deployment. Sealing at rest and the
 * storage key that opens the seal stay with the signer, so a sealed
 * record the signer cannot open surfaces here as the same
 * RecordCorruptedError or RecordUnreadableError a local store raises.
 */
export const createRemoteAccountRecordStore = (
  client: SignerRequester,
): AccountRecordStore => ({
  read: () =>
    defer(async () => requestSigner(client, 'record-read', {})).pipe(
      map(result => decodeRecord(result, 'record')),
    ),
  write: record =>
    defer(async () => requestSigner(client, 'record-write', { record })).pipe(
      map(() => undefined),
    ),
  presence: () =>
    defer(async () => requestSigner(client, 'record-exists', {})).pipe(
      map(result => decodePresence(result, 'presence')),
    ),
});
