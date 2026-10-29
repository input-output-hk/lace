import { encryptionKeyOver, liveEnvelopeOver } from '../acc/enc-keys';

import { asPassport } from './passkey-errors';

import type { FindLiveEnvelope } from '../acc/enc-keys';
import type { PassportEncryptionKey } from '@lace-contract/passport';
import type { PasskeySessionKeySource } from '@lace-lib/passkey';

/** A PassportEncryptionKey with every member, the view ones included. */
export type PasskeyEncryptionKey = Required<PassportEncryptionKey>;

/**
 * A PassportEncryptionKey over a {@link PasskeySessionKeySource}, the production
 * key source for Passport accounts. The source derives this device's
 * reader secret inside the open key session, so a flow that also signs
 * prompts once; the account secret is random, reaches this device only
 * sealed in its envelopes on chain, and is opened from them for one call
 * at a time. Only public keys, inbox entries, the coins and bookkeeping
 * they open to, the sealed secret of a read grant and maintenance update
 * signatures leave this function, every secret being zeroed as soon as
 * its one use is over. A dismissed prompt or a PRF-less authenticator
 * surfaces as the matching Passport error.
 */
export const createPasskeyEncryptionKey = (
  keySource: PasskeySessionKeySource,
): PasskeyEncryptionKey => {
  const key = encryptionKeyOver(async params => keySource.deriveSecret(params));
  return {
    readerPublicKey: async networkId =>
      asPassport(async () => key.readerPublicKey(networkId)),
    createKeys: async (networkId, request) =>
      asPassport(async () => key.createKeys(networkId, request)),
    sealToDevice: async (networkId, keyring, reader) =>
      asPassport(async () => key.sealToDevice(networkId, keyring, reader)),
    openInbox: async (networkId, keyring, entries) =>
      asPassport(async () => key.openInbox(networkId, keyring, entries)),
    sealGrant: async (networkId, account, grant) =>
      asPassport(async () => key.sealGrant(networkId, account, grant)),
    reencryptInbox: async (networkId, rotation, entries) =>
      asPassport(async () => key.reencryptInbox(networkId, rotation, entries)),
    sealView: async (networkId, keyring, request) =>
      asPassport(async () => key.sealView(networkId, keyring, request)),
    signMaintenanceUpdate: async (networkId, request) =>
      asPassport(async () => key.signMaintenanceUpdate(networkId, request)),
    holdsMaintenanceAuthority: async (networkId, keyring, authority) =>
      asPassport(async () =>
        key.holdsMaintenanceAuthority(networkId, keyring, authority),
      ),
  };
};

/**
 * Finds the live envelope among a page of this device's envelopes over a
 * {@link PasskeySessionKeySource}, see {@link liveEnvelopeOver}, mapping
 * a dismissed prompt or a PRF-less authenticator to the matching
 * Passport error. Only the envelope's position leaves it.
 */
export const createPasskeyLiveEnvelopeFinder = (
  keySource: PasskeySessionKeySource,
): FindLiveEnvelope => {
  const find = liveEnvelopeOver(async params => keySource.deriveSecret(params));
  return async (networkId, keyring) =>
    asPassport(async () => find(networkId, keyring));
};
