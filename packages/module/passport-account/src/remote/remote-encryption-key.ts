import {
  EncryptionKeyMismatchError,
  MaintenanceAuthorityMismatchError,
} from '@lace-contract/passport';

import { MAX_INBOX_ENTRIES_PER_REQUEST } from '../acc/inbox';

import {
  decodeAccountKeys,
  decodeBoolean,
  decodeBytes,
  decodeDeviceDelivery,
  decodeInboxEntries,
  decodeLiveEnvelope,
  decodeOpenedEntries,
  decodeSealedEntries,
  decodeSignedMaintenanceUpdate,
  decodeViewDelivery,
  encodeBigInt,
  encodeBytes,
  encodeKeyring,
  encodeLiveReader,
  encodeMaintenanceChanges,
  encodeRemovedDevice,
  MalformedPayloadError,
} from './codec';
import { requestSigner } from './request';

import type { SignerRequester } from './request';
import type {
  AccountKeyring,
  OpenedInboxEntry,
  PassportEncryptionKey,
} from '@lace-contract/passport';

const X25519_PUBLIC_KEY_LENGTH = 32;

/**
 * `entries` in consecutive batches of at most the entries the signer
 * opens per request, in order; none for an empty list.
 */
const inboxBatches = (entries: readonly Uint8Array[]): Uint8Array[][] => {
  const batches: Uint8Array[][] = [];
  for (
    let start = 0;
    start < entries.length;
    start += MAX_INBOX_ENTRIES_PER_REQUEST
  ) {
    batches.push(entries.slice(start, start + MAX_INBOX_ENTRIES_PER_REQUEST));
  }
  return batches;
};

const encodeEntries = (entries: readonly Uint8Array[]): string[] =>
  entries.map(entry => encodeBytes(entry));

/**
 * Sends `entries` to the signer in batches through `request` and joins
 * the answers in order, refusing an answer whose length is not its
 * batch's.
 */
const inBatches = async <T>(
  entries: readonly Uint8Array[],
  field: string,
  request: (batch: Uint8Array[]) => Promise<T[]>,
): Promise<T[]> => {
  const answered: T[] = [];
  for (const batch of inboxBatches(entries)) {
    const items = await request(batch);
    if (items.length !== batch.length) throw new MalformedPayloadError(field);
    answered.push(...items);
  }
  return answered;
};

/**
 * Where the live envelope sits among the envelopes of a keyring with
 * more of them than one request carries. The envelopes are paged to the
 * signer, oldest page first, so the first page holding one holds the
 * oldest, the one the signer takes as live, however many envelopes
 * anyone appended after it.
 *
 * @throws {@link EncryptionKeyMismatchError} when no page holds an
 * envelope whose secret derives the keyring's `enc_key`.
 */
const findLivePosition = async (
  client: SignerRequester,
  networkId: string,
  keyring: AccountKeyring,
): Promise<number> => {
  const { envelopes } = keyring;
  for (
    let end = envelopes.length;
    end > 0;
    end -= MAX_INBOX_ENTRIES_PER_REQUEST
  ) {
    const start = Math.max(0, end - MAX_INBOX_ENTRIES_PER_REQUEST);
    const page = envelopes.slice(start, end);
    const live = decodeLiveEnvelope(
      await requestSigner(client, 'find-live-envelope', {
        networkId,
        keyring: encodeKeyring({ ...keyring, envelopes: page }),
      }),
      'live',
      page.length,
    );
    if (live !== null) return start + live;
  }
  throw new EncryptionKeyMismatchError(
    "None of this device's envelopes opens the account's enc_key.",
  );
};

/**
 * The keyrings a maintenance update is signed over, tried in order until
 * one holds the roster key whose authority the chain holds: `keyring`
 * itself when its envelopes fit one request, otherwise the live envelope
 * at `live` with, beside it, each consecutive run of the envelopes older
 * than it, so every roster key the device was sealed before the live one
 * is reached however many envelopes sit between, in requests of at most
 * one request's envelopes. The live envelope is in every keyring, since
 * the signer takes the live roster key from it.
 */
const maintenanceKeyrings = (
  keyring: AccountKeyring,
  live: number | undefined,
): AccountKeyring[] => {
  if (live === undefined) return [keyring];
  const liveEnvelope = keyring.envelopes[live];
  const older = keyring.envelopes.slice(live + 1);
  const run = MAX_INBOX_ENTRIES_PER_REQUEST - 1;
  const keyrings: AccountKeyring[] = [];
  let start = 0;
  do {
    keyrings.push({
      ...keyring,
      envelopes: [liveEnvelope, ...older.slice(start, start + run)],
    });
    start += run;
  } while (start < older.length);
  return keyrings;
};

/**
 * A PassportEncryptionKey whose reader secret lives with the Lace signer
 * page. The signer derives this device's reader key, draws the random
 * account secrets and opens them from the envelopes it is sent, and
 * answers with public keys, inbox entries it sealed, or what the entries
 * it was sent open to, so the dApp never holds the viewing capability,
 * only what the signer opened or sealed for the flow it approved. An
 * inbox is opened or re-encrypted in batches of at most the entries the
 * signer serves per request, each answered with one item, or null, per
 * entry it sent; every batch carries the keyring. A keyring with more
 * envelopes than one request carries has its live envelope found once,
 * see {@link findLivePosition}, and is then sent from the live envelope
 * on, as many as fit. Unlike the whole keyring a local key opens, that
 * leaves out the envelopes newer than the live one, which the live keys
 * are never taken from and which add only secrets sealed to this reader
 * key after the live one landed. A maintenance update is signed over the
 * live envelope and the older ones in turn instead, see
 * {@link maintenanceKeyrings}, since the roster key behind the authority
 * on chain may sit behind any number of envelopes; it rejects with
 * MaintenanceAuthorityMismatchError once none of them holds it. Whether
 * the device holds that authority is asked over the same keyrings, and
 * answered true once one of them does.
 */
export const createRemoteEncryptionKey = (
  client: SignerRequester,
): Required<PassportEncryptionKey> => {
  const positions = new WeakMap<AccountKeyring, number>();
  const livePosition = async (
    networkId: string,
    keyring: AccountKeyring,
  ): Promise<number | undefined> => {
    if (keyring.envelopes.length <= MAX_INBOX_ENTRIES_PER_REQUEST) {
      return undefined;
    }
    const known =
      positions.get(keyring) ??
      (await findLivePosition(client, networkId, keyring));
    positions.set(keyring, known);
    return known;
  };
  const carriedKeyring = async (
    networkId: string,
    keyring: AccountKeyring,
  ): Promise<ReturnType<typeof encodeKeyring>> => {
    const live = await livePosition(networkId, keyring);
    return encodeKeyring(
      live === undefined
        ? keyring
        : {
            ...keyring,
            envelopes: keyring.envelopes.slice(
              live,
              live + MAX_INBOX_ENTRIES_PER_REQUEST,
            ),
          },
    );
  };
  return {
    readerPublicKey: async networkId =>
      decodeBytes(
        await requestSigner(client, 'reader-public-key', { networkId }),
        'readerPublicKey',
        X25519_PUBLIC_KEY_LENGTH,
      ),
    createKeys: async (
      networkId,
      {
        devicePublicKey,
        keyring,
        registrations,
        readers,
        rotateRoster,
        removed,
      },
    ) =>
      decodeAccountKeys(
        await requestSigner(client, 'create-keys', {
          networkId,
          devicePublicKey,
          ...(keyring
            ? { keyring: await carriedKeyring(networkId, keyring) }
            : {}),
          ...(registrations
            ? { registrations: encodeEntries(registrations) }
            : {}),
          ...(readers
            ? { readers: readers.map(reader => encodeLiveReader(reader)) }
            : {}),
          ...(rotateRoster === undefined ? {} : { rotateRoster }),
          ...(removed ? { removed: encodeRemovedDevice(removed) } : {}),
        }),
        'keys',
      ),
    sealToDevice: async (networkId, keyring, reader) =>
      decodeDeviceDelivery(
        await requestSigner(client, 'seal-to-device', {
          networkId,
          keyring: await carriedKeyring(networkId, keyring),
          reader: encodeLiveReader(reader),
        }),
        'delivery',
      ),
    openInbox: async (networkId, keyring, entries) => {
      const sent = await carriedKeyring(networkId, keyring);
      return inBatches<OpenedInboxEntry | null>(
        entries,
        'opened',
        async batch =>
          decodeOpenedEntries(
            await requestSigner(client, 'open-inbox', {
              networkId,
              keyring: sent,
              entries: encodeEntries(batch),
            }),
            'opened',
          ),
      );
    },
    sealGrant: async (networkId, account, grant) =>
      decodeInboxEntries(
        await requestSigner(client, 'seal-grant', {
          networkId,
          account,
          grant,
        }),
        'entries',
      ),
    reencryptInbox: async (networkId, { keyring, to }, entries) => {
      const sent = await carriedKeyring(networkId, keyring);
      return inBatches<Uint8Array | null>(entries, 'entries', async batch =>
        decodeSealedEntries(
          await requestSigner(client, 'reencrypt-inbox', {
            networkId,
            keyring: sent,
            to: encodeBytes(to),
            entries: encodeEntries(batch),
          }),
          'entries',
        ),
      );
    },
    sealView: async (networkId, keyring, { grantId, account, readPublicKey }) =>
      decodeViewDelivery(
        await requestSigner(client, 'seal-view', {
          networkId,
          keyring: await carriedKeyring(networkId, keyring),
          grantId,
          account,
          readPublicKey,
        }),
        'view',
      ),
    signMaintenanceUpdate: async (
      networkId,
      { keyring, authority, counter, changes },
    ) => {
      const keyrings = maintenanceKeyrings(
        keyring,
        await livePosition(networkId, keyring),
      );
      for (const sent of keyrings) {
        const signed = decodeSignedMaintenanceUpdate(
          await requestSigner(client, 'sign-maintenance-update', {
            networkId,
            keyring: encodeKeyring(sent),
            authority: { tag: authority.tag, value: authority.value },
            counter: encodeBigInt(counter),
            changes: encodeMaintenanceChanges(changes),
          }),
          'signed',
        );
        if (signed) return signed;
      }
      throw new MaintenanceAuthorityMismatchError();
    },
    holdsMaintenanceAuthority: async (networkId, keyring, authority) => {
      const keyrings = maintenanceKeyrings(
        keyring,
        await livePosition(networkId, keyring),
      );
      for (const sent of keyrings) {
        const isHeld = decodeBoolean(
          await requestSigner(client, 'holds-maintenance-authority', {
            networkId,
            keyring: encodeKeyring(sent),
            authority: { tag: authority.tag, value: authority.value },
          }),
          'holds',
        );
        if (isHeld) return true;
      }
      return false;
    },
  };
};
