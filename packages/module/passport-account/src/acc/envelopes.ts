/**
 * The Lace record kinds an Account Custody Contract inbox carries beside
 * the coin entries senders write: device envelopes, which deliver the
 * account secret and the roster key to one device's reader key; device
 * registrations, which name an enrolled device's reader and device keys
 * under the roster key; and grant records, which keep the bookkeeping of
 * a grant this device issued under a key only it derives. Each is one
 * 192-byte entry led by a type byte no custody standard reader knows, so
 * every other reader skips it as noise, and each opens to null rather
 * than an error when it is malformed, tampered with or addressed to
 * someone else, since anyone may append any bytes to the inbox.
 */
import { GrantId, GrantScopeSalt, GrantSlot } from '@lace-contract/passport';
import { sha256 } from '@lace-lib/crypto';
import { ByteArray, HexBytes } from '@lace-lib/util';
import { x25519 } from '@noble/curves/ed25519.js';
import { jubjub } from '@noble/curves/misc.js';

import { RECIPIENT_KINDS } from './grant-rules';
import { INBOX_ENTRY_LENGTH } from './inbox';
import { GRANT_VIEW_SEAL_LENGTH } from './view-seal';

import type {
  AccAddress,
  DeviceReader,
  GrantObjectFields,
  GranteeScheme,
  GrantRecipient,
  GrantRecordPart,
} from '@lace-contract/passport';

/** Type byte of a device envelope. */
const DEVICE_ENVELOPE_TYPE = 0xd1;

/** Type byte of a device registration. */
const DEVICE_REGISTRATION_TYPE = 0xd2;

/** Type byte of a grant record. */
const GRANT_RECORD_TYPE = 0xd3;

/**
 * How many earlier account secrets a keyring opens beside the live one,
 * newest first: they only reopen coins an interrupted rotation or a
 * racing sender stranded under an earlier key, so a short window is
 * enough. The live secret is searched for past it, through every
 * envelope a keyring carries.
 */
export const MAX_KEYRING_SECRETS = 16;

/**
 * The most device entries a rotation names, held by the client that names
 * them and the signer that checks each reader against them alike, so a
 * rotation never holds the signer deriving device entries without bound.
 */
export const MAX_DEVICE_ENTRIES = 64;

/** How many leading bytes of `enc_key` a grant view record carries. */
export const ENC_KEY_PREFIX_LENGTH = 3;

const SUITE = 0x02;
const KEY_LENGTH = 32;
const NONCE_LENGTH = 12;
const TAG_LENGTH = 16;
const RECIPIENT_TAG_LENGTH = 32;
const AEAD_TAG_BITS = TAG_LENGTH * 8;
const MAX_COIN_VALUE_LENGTH = 16;
const BYTE_BITS = 8n;
const BYTE_MASK = 0xffn;

const RECIPIENT_TAG_OFFSET = 2;
const RECIPIENT_TAG_END = RECIPIENT_TAG_OFFSET + RECIPIENT_TAG_LENGTH;

const ENVELOPE_EPHEMERAL_OFFSET = RECIPIENT_TAG_END;
const ENVELOPE_NONCE_OFFSET = ENVELOPE_EPHEMERAL_OFFSET + KEY_LENGTH;
const ENVELOPE_PLAINTEXT_LENGTH = KEY_LENGTH * 2;

const REGISTRATION_NONCE_OFFSET = 2;
const REGISTRATION_PLAINTEXT_LENGTH = KEY_LENGTH * 2;

const RECORD_NONCE_OFFSET = RECIPIENT_TAG_END;
const RECORD_AEAD_TAG_OFFSET = RECORD_NONCE_OFFSET + NONCE_LENGTH;
const RECORD_CIPHERTEXT_OFFSET = RECORD_AEAD_TAG_OFFSET + TAG_LENGTH;
const RECORD_PLAINTEXT_LENGTH = INBOX_ENTRY_LENGTH - RECORD_CIPHERTEXT_OFFSET;

const encoder = new TextEncoder();
const ENVELOPE_TAG_DOMAIN = encoder.encode('lace:passport:envelope-tag:v2');
const ENVELOPE_KEY_INFO = encoder.encode('lace:passport:device-envelope:v1');
const REGISTRATION_KEY_INFO = encoder.encode(
  'lace:passport:device-registration:v1',
);
const RECORD_KEY_INFO = encoder.encode('lace:passport:grant-record:v1');
const RECORD_TAG_KEY_INFO = encoder.encode('lace:passport:grant-record-tag:v1');

/**
 * What the byte leading a grant record part's plaintext names: the part
 * and, for a grant, the form of the key its 32-byte grantee field holds.
 * A jubjub key fills the field whole. A secp256k1 key, a 33-byte
 * compressed point, keeps its x coordinate in the field and its parity
 * prefix in the part byte.
 */
type RecordPartKind =
  | { part: 'grant'; granteeScheme: GranteeScheme; keyPrefix?: number }
  | { part: 'object' }
  | { part: 'view' };

/**
 * The kinds of grant record part, by the byte that leads its plaintext.
 * The jubjub grant, object and view values come first, so the records
 * written before secp256k1 grantees read back unchanged.
 */
const RECORD_PART_KINDS: readonly RecordPartKind[] = [
  { part: 'grant', granteeScheme: 'jubjub-schnorr' },
  { part: 'object' },
  { part: 'view' },
  { part: 'grant', granteeScheme: 'secp256k1-ecdsa', keyPrefix: 0x02 },
  { part: 'grant', granteeScheme: 'secp256k1-ecdsa', keyPrefix: 0x03 },
];

/**
 * A Jubjub device public key in the compressed 32-byte form a device
 * registration carries, as lowercase hex: the y coordinate little-endian
 * with the parity of x in its top bit.
 */
export const encodeDevicePublicKey = (point: {
  x: bigint;
  y: bigint;
}): string => HexBytes.fromByteArray(jubjub.Point.fromAffine(point).toBytes());

/**
 * The affine Jubjub point a compressed device public key names, or
 * undefined for hex that is no point on the curve.
 */
export const decodeDevicePublicKey = (
  hex: string,
): { x: bigint; y: bigint } | undefined => {
  try {
    return jubjub.Point.fromBytes(ByteArray.fromHex(HexBytes(hex))).toAffine();
  } catch {
    return undefined;
  }
};

/** What a device envelope delivers: the account secret and the roster key. */
export type AccountSecrets = { secret: Uint8Array; rosterKey: Uint8Array };

const concat = (...parts: Uint8Array[]): Uint8Array<ArrayBuffer> => {
  const joined = new Uint8Array(
    parts.reduce((length, part) => length + part.length, 0),
  );
  let offset = 0;
  for (const part of parts) {
    joined.set(part, offset);
    offset += part.length;
  }
  return joined;
};

const isZero = (bytes: Uint8Array): boolean => bytes.every(byte => byte === 0);

const equalBytes = (left: Uint8Array, right: Uint8Array): boolean =>
  left.length === right.length &&
  left.every((byte, index) => byte === right[index]);

/** Whether an entry is a 192-byte record of the given type and suite. */
const isRecordOf = (entry: Uint8Array, type: number): boolean =>
  entry.length === INBOX_ENTRY_LENGTH &&
  entry[0] === type &&
  entry[1] === SUITE;

/**
 * Whether an inbox entry is one of the Lace record kinds, which a coin
 * walk passes over rather than counts as noise.
 */
export const isLaceRecord = (entry: Uint8Array): boolean =>
  isRecordOf(entry, DEVICE_ENVELOPE_TYPE) ||
  isRecordOf(entry, DEVICE_REGISTRATION_TYPE) ||
  isRecordOf(entry, GRANT_RECORD_TYPE);

/** Whether an inbox entry is a device registration. */
export const isDeviceRegistration = (entry: Uint8Array): boolean =>
  isRecordOf(entry, DEVICE_REGISTRATION_TYPE);

/**
 * The HMAC-SHA256 key HKDF-SHA256 derives from `material` under `info`
 * with an empty salt, imported non-extractable, so the key bytes never
 * exist outside it.
 */
const hmacKey = async (
  material: Uint8Array,
  info: Uint8Array,
): Promise<CryptoKey> => {
  const key = await crypto.subtle.importKey(
    'raw',
    material as Uint8Array<ArrayBuffer>,
    'HKDF',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0),
      info: info as Uint8Array<ArrayBuffer>,
    },
    key,
    { name: 'HMAC', hash: 'SHA-256', length: KEY_LENGTH * 8 },
    false,
    ['sign'],
  );
};

/**
 * The AES-256-GCM key HKDF-SHA256 derives from `material` under `info`,
 * imported non-extractable, so the key bytes never exist outside it.
 */
const aeadKey = async (
  material: Uint8Array,
  info: Uint8Array,
): Promise<CryptoKey> => {
  const key = await crypto.subtle.importKey(
    'raw',
    material as Uint8Array<ArrayBuffer>,
    'HKDF',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0),
      info: info as Uint8Array<ArrayBuffer>,
    },
    key,
    { name: 'AES-GCM', length: KEY_LENGTH * 8 },
    false,
    ['encrypt', 'decrypt'],
  );
};

/**
 * Where an entry's AEAD frame sits: the nonce at `nonceOffset`, then the
 * AEAD tag and the ciphertext, and whether a recipient tag leads the
 * header after the type and suite bytes.
 */
type Frame = {
  key: CryptoKey;
  entry: Uint8Array;
  nonceOffset: number;
  isTagged: boolean;
};

type SealFrame = Frame & { plaintext: Uint8Array };

/** A fresh AEAD nonce. */
const freshNonce = (): Uint8Array =>
  crypto.getRandomValues(new Uint8Array(NONCE_LENGTH));

/**
 * The associated data of an entry: every byte before its AEAD tag, less
 * the recipient tag when it carries one, since that tag is computed over
 * the sealed entry and binds it in turn.
 */
const associatedData = ({
  entry,
  nonceOffset,
  isTagged,
}: Omit<Frame, 'key'>): Uint8Array<ArrayBuffer> => {
  const tagOffset = nonceOffset + NONCE_LENGTH;
  return isTagged
    ? concat(
        entry.subarray(0, RECIPIENT_TAG_OFFSET),
        entry.subarray(RECIPIENT_TAG_END, tagOffset),
      )
    : entry.slice(0, tagOffset);
};

/**
 * Encrypts `plaintext` into `entry` behind its header: the AEAD tag
 * after the nonce the entry already holds at `nonceOffset`, and the
 * ciphertext after that, with the header as associated data, see
 * {@link associatedData}, so the header must be complete before this
 * runs, its recipient tag aside.
 */
const sealInto = async ({
  key,
  entry,
  nonceOffset,
  isTagged,
  plaintext,
}: SealFrame): Promise<void> => {
  const nonce = entry.slice(nonceOffset, nonceOffset + NONCE_LENGTH);
  const tagOffset = nonceOffset + NONCE_LENGTH;
  const sealed = new Uint8Array(
    await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: nonce,
        additionalData: associatedData({ entry, nonceOffset, isTagged }),
        tagLength: AEAD_TAG_BITS,
      },
      key,
      plaintext as Uint8Array<ArrayBuffer>,
    ),
  );
  entry.set(sealed.subarray(plaintext.length), tagOffset);
  entry.set(sealed.subarray(0, plaintext.length), tagOffset + TAG_LENGTH);
};

type OpenFrame = Frame & { plaintextLength: number };

/**
 * Decrypts the ciphertext behind an entry's header, or null when the
 * authentication fails or the padding after the ciphertext is not zero.
 */
const openFrom = async ({
  key,
  entry,
  nonceOffset,
  isTagged,
  plaintextLength,
}: OpenFrame): Promise<Uint8Array | null> => {
  const tagOffset = nonceOffset + NONCE_LENGTH;
  const ciphertextOffset = tagOffset + TAG_LENGTH;
  if (!isZero(entry.subarray(ciphertextOffset + plaintextLength))) return null;
  try {
    return new Uint8Array(
      await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: entry.slice(nonceOffset, tagOffset),
          additionalData: associatedData({ entry, nonceOffset, isTagged }),
          tagLength: AEAD_TAG_BITS,
        },
        key,
        concat(
          entry.subarray(ciphertextOffset, ciphertextOffset + plaintextLength),
          entry.subarray(tagOffset, ciphertextOffset),
        ),
      ),
    );
  } catch {
    return null;
  }
};

/**
 * The recipient tag of a device envelope: SHA-256 over the tag domain,
 * the type and suite bytes, the reader public key and every byte after
 * the tag, the ephemeral key, the nonce, the AEAD tag, the ciphertext
 * and the padding. A reader finds its envelopes by recomputing it, so
 * an entry that copies a genuine envelope's tag with any other byte
 * changed is not taken for one, and writing an entry that is takes the
 * reader public key. Two envelopes to the same reader share nothing on
 * chain, since each carries its own ephemeral key.
 */
const envelopeTag = (
  readerPublicKey: Uint8Array,
  entry: Uint8Array,
): Uint8Array =>
  sha256(
    concat(
      ENVELOPE_TAG_DOMAIN,
      entry.subarray(0, RECIPIENT_TAG_OFFSET),
      readerPublicKey,
      entry.subarray(RECIPIENT_TAG_END),
    ),
  );

/** Whether an entry is a device envelope addressed to this reader public key. */
export const isAddressedTo = (
  entry: Uint8Array,
  readerPublicKey: Uint8Array,
): boolean =>
  isRecordOf(entry, DEVICE_ENVELOPE_TYPE) &&
  equalBytes(
    entry.subarray(RECIPIENT_TAG_OFFSET, RECIPIENT_TAG_END),
    envelopeTag(readerPublicKey, entry),
  );

/**
 * Every envelope in an inbox addressed to this device, newest first: the
 * ones a keyring carries. Anyone who knows a reader key can append
 * envelopes tagged for it, so none is left out, and the live one is
 * found however many land after it, at the cost of opening each.
 */
export const deviceEnvelopes = (
  entries: readonly Uint8Array[],
  readerPublicKey: Uint8Array,
): Uint8Array[] =>
  entries.filter(entry => isAddressedTo(entry, readerPublicKey)).reverse();

/**
 * The AES-256-GCM key of one envelope: HKDF-SHA256 over the X25519 shared
 * secret, zeroed once the key is derived.
 */
const envelopeKey = async (shared: Uint8Array): Promise<CryptoKey> => {
  try {
    return await aeadKey(shared, ENVELOPE_KEY_INFO);
  } finally {
    shared.fill(0);
  }
};

/**
 * Seals the account secret and the roster key to one device's reader key
 * as a device envelope: [0] type, [1] suite, [2..34) recipient tag,
 * [34..66) ephemeral X25519 public key, [66..78) nonce, [78..94) AEAD
 * tag, [94..158) the secret then the roster key, encrypted, and zero
 * padding to 192 bytes. The key is agreed between a fresh ephemeral key
 * and the reader key, everything before the AEAD tag but the recipient
 * tag is associated data, and the recipient tag, computed last, covers
 * the whole sealed envelope. The envelope carries no round or
 * `enc_key`: a reader trusts the secret only once it derives the
 * `enc_key` the ledger holds. The ephemeral secret is zeroed before this
 * returns.
 */
export const sealDeviceEnvelope = async (
  readerPublicKey: Uint8Array,
  { secret, rosterKey }: AccountSecrets,
): Promise<Uint8Array> => {
  const ephemeral = x25519.keygen();
  const plaintext = concat(secret, rosterKey);
  const entry = new Uint8Array(INBOX_ENTRY_LENGTH);
  entry[0] = DEVICE_ENVELOPE_TYPE;
  entry[1] = SUITE;
  entry.set(ephemeral.publicKey, ENVELOPE_EPHEMERAL_OFFSET);
  entry.set(freshNonce(), ENVELOPE_NONCE_OFFSET);
  try {
    const key = await envelopeKey(
      x25519.getSharedSecret(ephemeral.secretKey, readerPublicKey),
    );
    await sealInto({
      key,
      entry,
      nonceOffset: ENVELOPE_NONCE_OFFSET,
      isTagged: true,
      plaintext,
    });
    entry.set(envelopeTag(readerPublicKey, entry), RECIPIENT_TAG_OFFSET);
    return entry;
  } finally {
    ephemeral.secretKey.fill(0);
    plaintext.fill(0);
  }
};

/**
 * Opens a device envelope with this device's reader secret. Resolves the
 * account secret and roster key it delivers, which the caller zeroes once
 * used, or null for an entry that is not an envelope, is addressed to
 * another reader or fails to authenticate.
 */
export const openDeviceEnvelope = async (
  readerSecret: Uint8Array,
  entry: Uint8Array,
): Promise<AccountSecrets | null> => {
  if (!isAddressedTo(entry, x25519.getPublicKey(readerSecret))) return null;
  let key: CryptoKey;
  try {
    key = await envelopeKey(
      x25519.getSharedSecret(
        readerSecret,
        entry.slice(ENVELOPE_EPHEMERAL_OFFSET, ENVELOPE_NONCE_OFFSET),
      ),
    );
  } catch {
    return null;
  }
  const plaintext = await openFrom({
    key,
    entry,
    nonceOffset: ENVELOPE_NONCE_OFFSET,
    isTagged: true,
    plaintextLength: ENVELOPE_PLAINTEXT_LENGTH,
  });
  if (!plaintext) return null;
  try {
    return {
      secret: plaintext.slice(0, KEY_LENGTH),
      rosterKey: plaintext.slice(KEY_LENGTH),
    };
  } finally {
    plaintext.fill(0);
  }
};

/**
 * Seals one enrolled device's reader and device keys under the roster key
 * as a device registration: [0] type, [1] suite, [2..14) nonce, [14..30)
 * AEAD tag, [30..94) the reader key then the device key, encrypted, and
 * zero padding to 192 bytes. Only a holder of the roster key, an enrolled
 * device, can write one that opens, and nothing on chain tells whose it
 * is.
 */
export const sealDeviceRegistration = async (
  rosterKey: Uint8Array,
  { readerPublicKey, devicePublicKey }: DeviceReader,
): Promise<Uint8Array> => {
  const entry = new Uint8Array(INBOX_ENTRY_LENGTH);
  entry[0] = DEVICE_REGISTRATION_TYPE;
  entry[1] = SUITE;
  entry.set(freshNonce(), REGISTRATION_NONCE_OFFSET);
  await sealInto({
    key: await aeadKey(rosterKey, REGISTRATION_KEY_INFO),
    entry,
    nonceOffset: REGISTRATION_NONCE_OFFSET,
    isTagged: false,
    plaintext: concat(
      ByteArray.fromHex(HexBytes(readerPublicKey)),
      ByteArray.fromHex(HexBytes(devicePublicKey)),
    ),
  });
  return entry;
};

/**
 * Opens a device registration with the roster key: the device it names,
 * or null for an entry that is not a registration or was written under
 * another roster key.
 */
export const openDeviceRegistration = async (
  rosterKey: Uint8Array,
  entry: Uint8Array,
): Promise<DeviceReader | null> => {
  if (!isRecordOf(entry, DEVICE_REGISTRATION_TYPE)) return null;
  const plaintext = await openFrom({
    key: await aeadKey(rosterKey, REGISTRATION_KEY_INFO),
    entry,
    nonceOffset: REGISTRATION_NONCE_OFFSET,
    isTagged: false,
    plaintextLength: REGISTRATION_PLAINTEXT_LENGTH,
  });
  return (
    plaintext && {
      readerPublicKey: HexBytes.fromByteArray(plaintext.slice(0, KEY_LENGTH)),
      devicePublicKey: HexBytes.fromByteArray(plaintext.slice(KEY_LENGTH)),
    }
  );
};

/** The two keys a grant record is written and recognised under. */
type RecordKeys = { key: CryptoKey; tagKey: CryptoKey };

/**
 * The keys of this device's grant records on one account, both derived
 * from its reader secret with the account address in the label: the
 * AES-256-GCM key and the key its recipient tags are computed under, so
 * only this device writes a record that opens or recognises one as its
 * own, and a record copied from another account is neither.
 */
const recordKeys = async (
  readerSecret: Uint8Array,
  account: AccAddress,
): Promise<RecordKeys> => {
  const accountBytes = ByteArray.fromHex(HexBytes(account));
  return {
    key: await aeadKey(readerSecret, concat(RECORD_KEY_INFO, accountBytes)),
    tagKey: await hmacKey(
      readerSecret,
      concat(RECORD_TAG_KEY_INFO, accountBytes),
    ),
  };
};

/**
 * The recipient tag of a grant record: HMAC-SHA256 under the tag key
 * over the type and suite bytes and every byte after the tag, the
 * nonce, the AEAD tag and the ciphertext, so a copied tag with any other
 * byte changed is not taken for this device's.
 */
const recordTag = async (
  tagKey: CryptoKey,
  entry: Uint8Array,
): Promise<Uint8Array> =>
  new Uint8Array(
    await crypto.subtle.sign(
      'HMAC',
      tagKey,
      concat(
        entry.subarray(0, RECIPIENT_TAG_OFFSET),
        entry.subarray(RECIPIENT_TAG_END),
      ),
    ),
  );

const encodeAmount = (value: string): Uint8Array => {
  const bytes = new Uint8Array(MAX_COIN_VALUE_LENGTH);
  let remaining = BigInt(value);
  for (let index = MAX_COIN_VALUE_LENGTH - 1; index >= 0; index -= 1) {
    bytes[index] = Number(remaining & BYTE_MASK);
    remaining >>= BYTE_BITS;
  }
  return bytes;
};

const decodeAmount = (bytes: Uint8Array): string =>
  bytes
    .reduce((value, byte) => (value << BYTE_BITS) | BigInt(byte), 0n)
    .toString();

const hexBytes = (hex: string): Uint8Array => ByteArray.fromHex(HexBytes(hex));

const encodeRecipient = (recipient: GrantRecipient): Uint8Array =>
  concat(
    Uint8Array.of(Number(RECIPIENT_KINDS[recipient.kind])),
    recipient.kind === 'any'
      ? new Uint8Array(KEY_LENGTH)
      : hexBytes(recipient.value),
  );

const RECIPIENT_BY_KIND = new Map(
  Object.entries(RECIPIENT_KINDS).map(([kind, value]) => [
    Number(value),
    kind as GrantRecipient['kind'],
  ]),
);

const decodeRecipient = (bytes: Uint8Array): GrantRecipient | null => {
  const kind = RECIPIENT_BY_KIND.get(bytes[0]);
  const value = bytes.subarray(1);
  if (kind === undefined) return null;
  if (kind === 'any') return isZero(value) ? { kind } : null;
  return { kind, value: HexBytes.fromByteArray(value) };
};

/** The part byte of an object or a view part, which take one value each. */
const partByteOf = (part: 'object' | 'view'): number =>
  RECORD_PART_KINDS.findIndex(kind => kind.part === part);

/** A grant record part that carries the grant itself. */
type GrantPart = Extract<GrantRecordPart, { part: 'grant' }>;

/**
 * A grant part's 32-byte grantee field and the part byte naming its key
 * form.
 */
type EncodedGrantee = { partByte: number; field: Uint8Array };

/**
 * The grantee field of a grant part and the part byte that names how it
 * reads back, see {@link RecordPartKind}.
 *
 * @throws Error when the key is not in a form the record holds: a 32-byte
 * jubjub key, or a 33-byte compressed secp256k1 key prefixed 02 or 03.
 */
const encodeGrantee = (part: GrantPart): EncodedGrantee => {
  const key = hexBytes(part.granteePublicKey);
  const keyPrefix =
    part.granteeScheme === 'secp256k1-ecdsa' ? key[0] : undefined;
  const field = keyPrefix === undefined ? key : key.subarray(1);
  const partByte = RECORD_PART_KINDS.findIndex(
    kind =>
      kind.part === 'grant' &&
      kind.granteeScheme === part.granteeScheme &&
      kind.keyPrefix === keyPrefix,
  );
  if (partByte < 0 || field.length !== KEY_LENGTH) {
    throw new Error(
      `Grant record cannot carry this '${part.granteeScheme}' grantee key`,
    );
  }
  return { partByte, field };
};

/**
 * The plaintext of one grant record part, 130 bytes: the part byte and
 * the grant id, then for a grant the slot, the scope salt, the grantee
 * field and the read key (zero for none); for an object the colour, the
 * recipient kind and value, and the coin bound as a big-endian 128-bit
 * integer; for a view the leading bytes of `enc_key` and the 94-byte
 * seal; zero padding after. The part byte of a grant also names the form
 * of its grantee key, see {@link RecordPartKind}, and a grant part whose
 * grantee the format cannot hold is refused before anything is written.
 */
const encodeRecordPart = (part: GrantRecordPart): Uint8Array => {
  const plaintext = new Uint8Array(RECORD_PLAINTEXT_LENGTH);
  plaintext.set(hexBytes(part.grantId), 1);
  const body = 1 + KEY_LENGTH;
  switch (part.part) {
    case 'grant': {
      const { partByte, field } = encodeGrantee(part);
      plaintext[0] = partByte;
      plaintext[body] = part.slot;
      plaintext.set(hexBytes(part.scopeSalt), body + 1);
      plaintext.set(field, body + 1 + KEY_LENGTH);
      if (part.readPublicKey !== undefined) {
        plaintext.set(hexBytes(part.readPublicKey), body + 1 + KEY_LENGTH * 2);
      }
      return plaintext;
    }
    case 'object':
      plaintext[0] = partByteOf(part.part);
      plaintext.set(hexBytes(part.object.color), body);
      plaintext.set(encodeRecipient(part.object.recipient), body + KEY_LENGTH);
      plaintext.set(
        encodeAmount(part.object.maxCoinValue),
        body + KEY_LENGTH * 2 + 1,
      );
      return plaintext;
    case 'view':
      plaintext[0] = partByteOf(part.part);
      plaintext.set(hexBytes(part.encKeyPrefix), body);
      plaintext.set(hexBytes(part.seal), body + ENC_KEY_PREFIX_LENGTH);
      return plaintext;
  }
};

const decodeObject = (body: Uint8Array): GrantObjectFields | null => {
  const recipient = decodeRecipient(
    body.subarray(KEY_LENGTH, KEY_LENGTH * 2 + 1),
  );
  const amountOffset = KEY_LENGTH * 2 + 1;
  if (
    !recipient ||
    !isZero(body.subarray(amountOffset + MAX_COIN_VALUE_LENGTH))
  ) {
    return null;
  }
  return {
    color: HexBytes.fromByteArray(body.subarray(0, KEY_LENGTH)),
    recipient,
    maxCoinValue: decodeAmount(
      body.subarray(amountOffset, amountOffset + MAX_COIN_VALUE_LENGTH),
    ),
  };
};

/** Reads a grant record part back, or null for a plaintext no writer produces. */
const decodeRecordPart = (plaintext: Uint8Array): GrantRecordPart | null => {
  const kind = RECORD_PART_KINDS.at(plaintext[0]);
  if (!kind) return null;
  const grantId = GrantId(HexBytes.fromByteArray(plaintext.slice(1, 33)));
  const body = plaintext.subarray(1 + KEY_LENGTH);
  switch (kind.part) {
    case 'grant': {
      const field = body.subarray(1 + KEY_LENGTH, 1 + KEY_LENGTH * 2);
      const readKey = body.subarray(1 + KEY_LENGTH * 2);
      return {
        part: kind.part,
        grantId,
        slot: GrantSlot(body[0]),
        scopeSalt: GrantScopeSalt(
          HexBytes.fromByteArray(body.subarray(1, 1 + KEY_LENGTH)),
        ),
        granteeScheme: kind.granteeScheme,
        granteePublicKey: HexBytes.fromByteArray(
          kind.keyPrefix === undefined
            ? field
            : concat(Uint8Array.of(kind.keyPrefix), field),
        ),
        ...(isZero(readKey)
          ? {}
          : { readPublicKey: HexBytes.fromByteArray(readKey) }),
      };
    }
    case 'object': {
      const object = decodeObject(body);
      return object && { part: kind.part, grantId, object };
    }
    case 'view':
      return {
        part: kind.part,
        grantId,
        encKeyPrefix: HexBytes.fromByteArray(
          body.subarray(0, ENC_KEY_PREFIX_LENGTH),
        ),
        seal: HexBytes.fromByteArray(
          body.subarray(
            ENC_KEY_PREFIX_LENGTH,
            ENC_KEY_PREFIX_LENGTH + GRANT_VIEW_SEAL_LENGTH,
          ),
        ),
      };
  }
};

/**
 * Seals one part of a grant's bookkeeping for this device alone as a
 * grant record: [0] type, [1] suite, [2..34) recipient tag, [34..46)
 * nonce, [46..62) AEAD tag, [62..192) the 130-byte part, encrypted, with
 * everything before the AEAD tag but the recipient tag as associated
 * data. The key and the tag key are derived from this device's reader
 * secret and the account, so only this device writes a record that opens
 * and recognises its own on that account, and the tag, computed last
 * over the whole sealed record and its fresh nonce, links no two
 * records.
 */
export const sealGrantRecord = async (
  readerSecret: Uint8Array,
  account: AccAddress,
  part: GrantRecordPart,
): Promise<Uint8Array> => {
  const { key, tagKey } = await recordKeys(readerSecret, account);
  const plaintext = encodeRecordPart(part);
  const entry = new Uint8Array(INBOX_ENTRY_LENGTH);
  entry[0] = GRANT_RECORD_TYPE;
  entry[1] = SUITE;
  entry.set(freshNonce(), RECORD_NONCE_OFFSET);
  try {
    await sealInto({
      key,
      entry,
      nonceOffset: RECORD_NONCE_OFFSET,
      isTagged: true,
      plaintext,
    });
    entry.set(await recordTag(tagKey, entry), RECIPIENT_TAG_OFFSET);
    return entry;
  } finally {
    plaintext.fill(0);
  }
};

/**
 * Opens a grant record of one account with this device's reader secret:
 * the part it holds, or null for an entry that is not a grant record,
 * carries another device's or another account's tag, fails to
 * authenticate or decodes to no part.
 */
export const openGrantRecord = async (
  readerSecret: Uint8Array,
  account: AccAddress,
  entry: Uint8Array,
): Promise<GrantRecordPart | null> => {
  if (!isRecordOf(entry, GRANT_RECORD_TYPE)) return null;
  const { key, tagKey } = await recordKeys(readerSecret, account);
  if (
    !equalBytes(
      await recordTag(tagKey, entry),
      entry.subarray(RECIPIENT_TAG_OFFSET, RECIPIENT_TAG_END),
    )
  ) {
    return null;
  }
  const plaintext = await openFrom({
    key,
    entry,
    nonceOffset: RECORD_NONCE_OFFSET,
    isTagged: true,
    plaintextLength: RECORD_PLAINTEXT_LENGTH,
  });
  if (!plaintext) return null;
  try {
    return decodeRecordPart(plaintext);
  } catch {
    return null;
  } finally {
    plaintext.fill(0);
  }
};
