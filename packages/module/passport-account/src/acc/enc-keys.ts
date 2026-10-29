import {
  DeviceReaderInvalidError,
  DeviceRosterInvalidError,
  EncryptionKeyMismatchError,
  isSealableX25519Key,
} from '@lace-contract/passport';
import { sha256 } from '@lace-lib/crypto';
import { ByteArray, HexBytes } from '@lace-lib/util';
import { x25519 } from '@noble/curves/ed25519.js';

import {
  ENC_KEY_PREFIX_LENGTH,
  MAX_KEYRING_SECRETS,
  openDeviceEnvelope,
  openDeviceRegistration,
  openGrantRecord,
  sealDeviceEnvelope,
  sealDeviceRegistration,
  sealGrantRecord,
} from './envelopes';
import { openInboxEntry, sealInboxEntry } from './inbox';
import {
  authorityOf,
  derivesAuthority,
  loadMaintenanceLedger,
  signableChanges,
  signMaintenanceUpdate,
} from './maintenance-authority';
import { sealGrantView } from './view-seal';

import type { AccountSecrets } from './envelopes';
import type {
  AccountKeyring,
  DeviceReader,
  OpenedInboxEntry,
  PassportEncryptionKey,
  ShieldedCoin,
} from '@lace-contract/passport';

/**
 * MIP-0015 domain of a device's reader secret: the X25519 secret whose
 * public key the account's envelopes to that device are sealed to. The
 * context is the network id, so one passkey holds a distinct reader key
 * per network and no chain observer links its envelopes across networks.
 */
const READER_SECRET_DOMAIN = 'lace-passport:reader:v1';

/** Byte length of a raw X25519 key, public or secret. */
const KEY_LENGTH = 32;

const BYTES32_HEX_PATTERN = /^[0-9a-f]{64}$/;

/**
 * Derives one MIP-0015 domain-scoped secret from the material an
 * encryption key implementation holds: the passkey key source's
 * `deriveSecret`, or the same scheme over an in-memory seed.
 */
export type DeriveSecret = (params: {
  domain: string;
  context: string;
  length: number;
}) => Promise<Uint8Array>;

/**
 * Calls `run` with this device's reader secret on one network, which
 * exists for that use only and is zeroed before this settles, on success
 * and failure alike; `run` must not retain it.
 */
const withReaderSecret = async <T>(
  deriveSecret: DeriveSecret,
  networkId: string,
  run: (readerSecret: Uint8Array) => Promise<T>,
): Promise<T> => {
  const readerSecret = await deriveSecret({
    domain: READER_SECRET_DOMAIN,
    context: networkId,
    length: KEY_LENGTH,
  });
  try {
    return await run(readerSecret);
  } finally {
    readerSecret.fill(0);
  }
};

/**
 * The account secrets a keyring opens: `live`, the one whose secret
 * derives the keyring's `enc_key`, and `all`, the live one first and then
 * up to {@link MAX_KEYRING_SECRETS} earlier ones, newest first.
 */
type OpenedKeyring = { live: AccountSecrets; all: AccountSecrets[] };

const zeroSecrets = ({ secret, rosterKey }: AccountSecrets): void => {
  secret.fill(0);
  rosterKey.fill(0);
};

/**
 * Opens the envelopes of a keyring with the reader secret and runs `run`
 * over what they deliver. Every envelope is tried, so envelopes anyone
 * appended to this reader key cannot hide the live one, and the live
 * secrets are those of the oldest envelope that delivers the keyring's
 * `enc_key`: a genuine envelope lands before the rotation that installs
 * its key, while anyone else can seal that secret only after learning
 * it, so a later envelope with the right secret and a roster key of its
 * own never replaces the roster key. Up to {@link MAX_KEYRING_SECRETS}
 * earlier secrets, newest first, are kept beside it and the rest
 * dropped. Every secret is zeroed before this settles.
 *
 * @throws {@link EncryptionKeyMismatchError} when no envelope delivers a
 * secret deriving the keyring's `enc_key`.
 */
const withKeyring = async <T>(
  readerSecret: Uint8Array,
  { encKey, envelopes }: AccountKeyring,
  run: (opened: OpenedKeyring) => Promise<T>,
): Promise<T> => {
  const encKeyHex = HexBytes.fromByteArray(encKey);
  const seen = new Set<string>();
  const earlier: AccountSecrets[] = [];
  let live: AccountSecrets | undefined;
  try {
    for (const envelope of envelopes) {
      const secrets = await openDeviceEnvelope(readerSecret, envelope);
      if (!secrets) continue;
      const publicKey = HexBytes.fromByteArray(
        x25519.getPublicKey(secrets.secret),
      );
      if (publicKey === encKeyHex) {
        if (live) zeroSecrets(live);
        live = secrets;
        continue;
      }
      if (seen.has(publicKey)) {
        zeroSecrets(secrets);
        continue;
      }
      seen.add(publicKey);
      if (earlier.length < MAX_KEYRING_SECRETS) {
        earlier.push(secrets);
      } else {
        zeroSecrets(secrets);
      }
    }
    if (!live) {
      throw new EncryptionKeyMismatchError(
        "None of this device's envelopes opens the account's enc_key.",
      );
    }
    return await run({ live, all: [live, ...earlier] });
  } finally {
    if (live) zeroSecrets(live);
    for (const secrets of earlier) zeroSecrets(secrets);
  }
};

/**
 * Opens every envelope of a keyring with the reader secret and runs `run`
 * over the roster keys they deliver, each once: first the live one, which
 * the envelope {@link withKeyring} takes as live delivers, then the
 * others, newest first. Unlike the earlier secrets, no roster key is
 * dropped: the one deriving the maintenance authority on chain may sit
 * behind any number of envelopes anyone appended, so a flood costs the
 * device time only. Roster keys are told apart by their
 * sha256, so none is held as a string. Each secret is zeroed once its
 * public key is checked, and every roster key before this settles.
 *
 * @throws {@link EncryptionKeyMismatchError} when no envelope delivers a
 * secret deriving the keyring's `enc_key`.
 */
const withRosterKeys = async <T>(
  readerSecret: Uint8Array,
  { encKey, envelopes }: AccountKeyring,
  run: (rosterKeys: Uint8Array[]) => Promise<T>,
): Promise<T> => {
  const encKeyHex = HexBytes.fromByteArray(encKey);
  const distinct = new Map<string, Uint8Array>();
  let live: Uint8Array | undefined;
  try {
    for (const envelope of envelopes) {
      const secrets = await openDeviceEnvelope(readerSecret, envelope);
      if (!secrets) continue;
      const { secret, rosterKey } = secrets;
      const fingerprint = HexBytes.fromByteArray(sha256(rosterKey));
      const kept = distinct.get(fingerprint) ?? rosterKey;
      if (kept === rosterKey) {
        distinct.set(fingerprint, rosterKey);
      } else {
        rosterKey.fill(0);
      }
      try {
        const publicKey = x25519.getPublicKey(secret);
        if (HexBytes.fromByteArray(publicKey) === encKeyHex) live = kept;
      } finally {
        secret.fill(0);
      }
    }
    if (!live) {
      throw new EncryptionKeyMismatchError(
        "None of this device's envelopes opens the account's enc_key.",
      );
    }
    const liveRosterKey = live;
    return await run([
      liveRosterKey,
      ...[...distinct.values()].filter(
        rosterKey => rosterKey !== liveRosterKey,
      ),
    ]);
  } finally {
    for (const rosterKey of distinct.values()) rosterKey.fill(0);
  }
};

/**
 * Where a keyring's live envelope sits, as its position among the
 * envelopes, or null when none is live.
 */
export type FindLiveEnvelope = (
  networkId: string,
  keyring: AccountKeyring,
) => Promise<number | null>;

/**
 * Finds the envelope {@link withKeyring} takes as live over a source of
 * MIP-0015 secrets: the oldest, so the last in the newest-first order,
 * whose secret derives the keyring's `enc_key`. Only its position leaves;
 * every secret opened is zeroed before this settles. The hosted signer
 * answers it over one page of a device's envelopes at a time, so a
 * device holding more envelopes than one request carries still has its
 * live one found, however many land after it.
 */
export const liveEnvelopeOver =
  (deriveSecret: DeriveSecret): FindLiveEnvelope =>
  async (networkId, { encKey, envelopes }) =>
    withReaderSecret(deriveSecret, networkId, async readerSecret => {
      const encKeyHex = HexBytes.fromByteArray(encKey);
      let live: number | null = null;
      for (const [index, envelope] of envelopes.entries()) {
        const secrets = await openDeviceEnvelope(readerSecret, envelope);
        if (!secrets) continue;
        try {
          const publicKey = x25519.getPublicKey(secrets.secret);
          if (HexBytes.fromByteArray(publicKey) === encKeyHex) live = index;
        } finally {
          zeroSecrets(secrets);
        }
      }
      return live;
    });

/** Opens a coin entry with each secret in turn, newest first. */
const openCoin = async (
  { all }: OpenedKeyring,
  entry: Uint8Array,
): Promise<ShieldedCoin | null> => {
  for (const { secret } of all) {
    const coin = await openInboxEntry(secret, entry);
    if (coin) return coin;
  }
  return null;
};

/**
 * Holds a device a key seals to to what it must be: a sealable X25519
 * reader key and 32 bytes of device key, both lowercase hex.
 *
 * @throws {@link DeviceReaderInvalidError} when either is not.
 */
const assertDeviceReader = ({
  readerPublicKey,
  devicePublicKey,
}: DeviceReader): void => {
  if (
    !isSealableX25519Key(readerPublicKey) ||
    !BYTES32_HEX_PATTERN.test(devicePublicKey)
  ) {
    throw new DeviceReaderInvalidError();
  }
};

/** What a rotation's readers are held to: this device, the roster, the removed device's key. */
type ReaderCheck = {
  self: DeviceReader;
  registered: readonly DeviceReader[];
  removed: string | undefined;
};

/**
 * Holds the readers a caller asks a new secret to be sealed to to the
 * devices the live roster key registers: each must be registered with
 * exactly that device key, no reader or device key may appear twice,
 * this device's included, and none may carry the removed device's key or
 * a reader key the roster pairs with it.
 *
 * @throws {@link DeviceRosterInvalidError} when a reader is not
 * registered as named, appears twice, or belongs to the removed device.
 */
const assertRegisteredReaders = (
  readers: readonly DeviceReader[],
  { self, registered, removed }: ReaderCheck,
): void => {
  const removedReaders = new Set(
    registered
      .filter(({ devicePublicKey }) => devicePublicKey === removed)
      .map(({ readerPublicKey }) => readerPublicKey),
  );
  const pairs = new Set(
    registered.map(
      ({ readerPublicKey, devicePublicKey }) =>
        `${readerPublicKey}:${devicePublicKey}`,
    ),
  );
  const readerKeys = new Set([self.readerPublicKey]);
  const deviceKeys = new Set([self.devicePublicKey]);
  for (const { readerPublicKey, devicePublicKey } of readers) {
    if (
      !pairs.has(`${readerPublicKey}:${devicePublicKey}`) ||
      readerKeys.has(readerPublicKey) ||
      deviceKeys.has(devicePublicKey) ||
      devicePublicKey === removed ||
      removedReaders.has(readerPublicKey)
    ) {
      throw new DeviceRosterInvalidError(
        `The reader ${readerPublicKey} is not registered for its device under the live roster key, or is named twice.`,
      );
    }
    readerKeys.add(readerPublicKey);
    deviceKeys.add(devicePublicKey);
  }
};

/** Seals the account secrets to every reader, one envelope each in order. */
const sealToReaders = async (
  readers: readonly DeviceReader[],
  secrets: AccountSecrets,
): Promise<Uint8Array[]> =>
  Promise.all(
    readers.map(async ({ readerPublicKey }) =>
      sealDeviceEnvelope(ByteArray.fromHex(HexBytes(readerPublicKey)), secrets),
    ),
  );

/**
 * A PassportEncryptionKey over a source of MIP-0015 secrets, the one
 * implementation the passkey key and the development key share. The
 * source yields only this device's reader secret; the account secret is
 * drawn at random by `createKeys` and otherwise exists only as opened
 * from the envelopes a call is handed, for that call alone. Every secret
 * is zeroed before the call that opened it settles, except the hex and
 * wasm copies of a ledger signing key, which the ledger API cannot zero.
 * Only public keys, inbox entries, opened coins and bookkeeping, grant
 * view seals, maintenance update signatures and whether a keyring holds
 * the maintenance authority on chain leave it. The maintenance authority
 * a roster key derives exists only inside the call that derives it.
 */
export const encryptionKeyOver = (
  deriveSecret: DeriveSecret,
): Required<PassportEncryptionKey> => ({
  readerPublicKey: async networkId =>
    withReaderSecret(deriveSecret, networkId, async readerSecret =>
      x25519.getPublicKey(readerSecret),
    ),
  createKeys: async (
    networkId,
    {
      devicePublicKey,
      keyring,
      registrations = [],
      readers = [],
      rotateRoster,
      removed,
    },
  ) =>
    withReaderSecret(deriveSecret, networkId, async readerSecret => {
      const self: DeviceReader = {
        readerPublicKey: HexBytes.fromByteArray(
          x25519.getPublicKey(readerSecret),
        ),
        devicePublicKey,
      };
      assertDeviceReader(self);
      const create = async (
        others: readonly DeviceReader[],
        kept: Uint8Array | undefined,
      ) => {
        const sealedTo = [self, ...others];
        const secrets: AccountSecrets = {
          secret: x25519.utils.randomSecretKey(),
          rosterKey: kept
            ? kept.slice()
            : crypto.getRandomValues(new Uint8Array(KEY_LENGTH)),
        };
        try {
          return {
            authority: await authorityOf(
              await loadMaintenanceLedger(),
              secrets.rosterKey,
            ),
            encKey: x25519.getPublicKey(secrets.secret),
            envelopes: await sealToReaders(sealedTo, secrets),
            registrations: kept
              ? []
              : await Promise.all(
                  sealedTo.map(async reader =>
                    sealDeviceRegistration(secrets.rosterKey, {
                      readerPublicKey: reader.readerPublicKey,
                      devicePublicKey: reader.devicePublicKey,
                    }),
                  ),
                ),
          };
        } finally {
          zeroSecrets(secrets);
        }
      };
      if (!keyring) {
        if (readers.length > 0) {
          throw new DeviceRosterInvalidError(
            'An account without keys has no roster to seal to.',
          );
        }
        return create([], undefined);
      }
      return withKeyring(readerSecret, keyring, async ({ live }) => {
        const registered: DeviceReader[] = [];
        for (const entry of registrations) {
          const device = await openDeviceRegistration(live.rosterKey, entry);
          if (device) registered.push(device);
        }
        assertRegisteredReaders(readers, {
          self,
          registered,
          removed: removed?.devicePublicKey,
        });
        return create(readers, rotateRoster ? undefined : live.rosterKey);
      });
    }),
  sealToDevice: async (networkId, keyring, reader) => {
    assertDeviceReader(reader);
    return withReaderSecret(deriveSecret, networkId, async readerSecret =>
      withKeyring(readerSecret, keyring, async ({ live }) => ({
        envelope: await sealDeviceEnvelope(
          ByteArray.fromHex(HexBytes(reader.readerPublicKey)),
          live,
        ),
        registration: await sealDeviceRegistration(live.rosterKey, {
          readerPublicKey: reader.readerPublicKey,
          devicePublicKey: reader.devicePublicKey,
        }),
      })),
    );
  },
  openInbox: async (networkId, keyring, entries) =>
    withReaderSecret(deriveSecret, networkId, async readerSecret =>
      withKeyring(readerSecret, keyring, async opened => {
        const results: (OpenedInboxEntry | null)[] = [];
        for (const entry of entries) {
          const device = await openDeviceRegistration(
            opened.live.rosterKey,
            entry,
          );
          if (device) {
            results.push({ kind: 'device', device });
            continue;
          }
          const record = await openGrantRecord(
            readerSecret,
            keyring.account,
            entry,
          );
          if (record) {
            results.push({ kind: 'grant', record });
            continue;
          }
          const coin = await openCoin(opened, entry);
          results.push(coin && { kind: 'coin', coin });
        }
        return results;
      }),
    ),
  sealGrant: async (networkId, account, { object, ...grant }) =>
    withReaderSecret(deriveSecret, networkId, async readerSecret => [
      await sealGrantRecord(readerSecret, account, { part: 'grant', ...grant }),
      await sealGrantRecord(readerSecret, account, {
        part: 'object',
        grantId: grant.grantId,
        object,
      }),
    ]),
  reencryptInbox: async (networkId, { keyring, to }, entries) =>
    withReaderSecret(deriveSecret, networkId, async readerSecret =>
      withKeyring(readerSecret, keyring, async opened => {
        const sealed: (Uint8Array | null)[] = [];
        for (const entry of entries) {
          const coin = await openCoin(opened, entry);
          if (!coin) {
            sealed.push(null);
            continue;
          }
          try {
            sealed.push(await sealInboxEntry(to, coin));
          } finally {
            coin.nonce.fill(0);
          }
        }
        return sealed;
      }),
    ),
  sealView: async (networkId, keyring, binding) =>
    withReaderSecret(deriveSecret, networkId, async readerSecret =>
      withKeyring(readerSecret, keyring, async ({ live }) => {
        const seal = await sealGrantView(live.secret, binding);
        return {
          seal,
          entry: await sealGrantRecord(readerSecret, binding.account, {
            part: 'view',
            grantId: binding.grantId,
            encKeyPrefix: HexBytes.fromByteArray(
              keyring.encKey.slice(0, ENC_KEY_PREFIX_LENGTH),
            ),
            seal: HexBytes.fromByteArray(seal),
          }),
        };
      }),
    ),
  signMaintenanceUpdate: async (
    networkId,
    { keyring, authority, counter, changes: requested },
  ) => {
    const changes = await signableChanges(requested);
    const ledger = await loadMaintenanceLedger();
    return withReaderSecret(deriveSecret, networkId, async readerSecret =>
      withRosterKeys(readerSecret, keyring, async rosterKeys =>
        signMaintenanceUpdate(ledger, {
          address: keyring.account,
          rosterKeys,
          authority,
          counter,
          changes,
        }),
      ),
    );
  },
  holdsMaintenanceAuthority: async (networkId, keyring, authority) => {
    const ledger = await loadMaintenanceLedger();
    return withReaderSecret(deriveSecret, networkId, async readerSecret =>
      withRosterKeys(readerSecret, keyring, async rosterKeys =>
        derivesAuthority(ledger, rosterKeys, authority),
      ),
    );
  },
});
