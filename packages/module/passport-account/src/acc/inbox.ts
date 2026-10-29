import { x25519 } from '@noble/curves/ed25519.js';

import type { ShieldedCoin } from '@lace-contract/passport';

/**
 * The fixed length of an InboxEntry v1, the encrypted coin description
 * the Account Custody Contract stores as opaque `Bytes<192>`.
 */
export const INBOX_ENTRY_LENGTH = 192;

/**
 * The most inbox entries one open-inbox request carries, held by the
 * client that batches and the signer that answers alike: a busy inbox is
 * opened over several requests, so no single request holds the signer
 * decrypting without bound.
 */
export const MAX_INBOX_ENTRIES_PER_REQUEST = 4096;

const ENTRY_VERSION = 0x01;
const ENTRY_SUITE = 0x01;
const EPHEMERAL_KEY_OFFSET = 2;
const NONCE_OFFSET = 34;
const TAG_OFFSET = 46;
const CIPHERTEXT_OFFSET = 62;
const NONCE_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const COIN_NONCE_LENGTH = 32;
const COLOR_LENGTH = 32;
const VALUE_LENGTH = 16;
const PLAINTEXT_LENGTH = COIN_NONCE_LENGTH + COLOR_LENGTH + VALUE_LENGTH;
const AEAD_TAG_BITS = TAG_LENGTH * 8;
const VALUE_MAX = (1n << BigInt(VALUE_LENGTH * 8)) - 1n;
const BYTE_BITS = 8n;
const BYTE_MASK = 0xffn;
const WRAPPING_KEY_INFO = new TextEncoder().encode(
  'midnight:custody:inbox:v1',
) as Uint8Array<ArrayBuffer>;

/**
 * The AES-256-GCM key that wraps one entry: HKDF-SHA256 over the X25519
 * shared secret with an empty salt and the fixed inbox label, imported
 * non-extractable so the key bytes never exist outside the shared secret,
 * which is zeroed once the key is derived.
 */
const wrappingKey = async (shared: Uint8Array): Promise<CryptoKey> => {
  try {
    const material = await crypto.subtle.importKey(
      'raw',
      shared as Uint8Array<ArrayBuffer>,
      'HKDF',
      false,
      ['deriveKey'],
    );
    return await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new Uint8Array(0),
        info: WRAPPING_KEY_INFO,
      },
      material,
      { name: 'AES-GCM', length: KEY_LENGTH * 8 },
      false,
      ['encrypt', 'decrypt'],
    );
  } finally {
    shared.fill(0);
  }
};

const encodeValue = (value: bigint): Uint8Array<ArrayBuffer> => {
  const bytes = new Uint8Array(VALUE_LENGTH);
  let remaining = value;
  for (let index = VALUE_LENGTH - 1; index >= 0; index -= 1) {
    bytes[index] = Number(remaining & BYTE_MASK);
    remaining >>= BYTE_BITS;
  }
  return bytes;
};

const decodeValue = (bytes: Uint8Array): bigint =>
  bytes.reduce((value, byte) => (value << BYTE_BITS) | BigInt(byte), 0n);

const encodeCoin = ({
  nonce,
  color,
  value,
}: ShieldedCoin): Uint8Array<ArrayBuffer> => {
  if (nonce.length !== COIN_NONCE_LENGTH || color.length !== COLOR_LENGTH) {
    throw new Error(
      `An inbox coin description needs a ${COIN_NONCE_LENGTH}-byte nonce and a ${COLOR_LENGTH}-byte colour.`,
    );
  }
  if (value < 0n || value > VALUE_MAX) {
    throw new Error(
      `An inbox coin value must fit an unsigned 128-bit integer, got ${value}.`,
    );
  }
  const plaintext = new Uint8Array(PLAINTEXT_LENGTH);
  plaintext.set(nonce, 0);
  plaintext.set(color, COIN_NONCE_LENGTH);
  plaintext.set(encodeValue(value), COIN_NONCE_LENGTH + COLOR_LENGTH);
  return plaintext;
};

const decodeCoin = (plaintext: Uint8Array): ShieldedCoin => ({
  nonce: plaintext.slice(0, COIN_NONCE_LENGTH),
  color: plaintext.slice(COIN_NONCE_LENGTH, COIN_NONCE_LENGTH + COLOR_LENGTH),
  value: decodeValue(plaintext.slice(COIN_NONCE_LENGTH + COLOR_LENGTH)),
});

/**
 * Seals a coin description towards an account as an InboxEntry v1: the
 * plaintext is the coin nonce, colour and big-endian 128-bit value, wrapped
 * under a key agreed between a fresh ephemeral X25519 key and the
 * account's `enc_key`, with the version and suite bytes as associated
 * data; the trailing padding stays zero. The ephemeral secret is zeroed
 * before this returns.
 */
export const sealInboxEntry = async (
  encPublicKey: Uint8Array,
  coin: ShieldedCoin,
): Promise<Uint8Array> => {
  const plaintext = encodeCoin(coin);
  const ephemeral = x25519.keygen();
  const entry = new Uint8Array(INBOX_ENTRY_LENGTH);
  entry[0] = ENTRY_VERSION;
  entry[1] = ENTRY_SUITE;
  try {
    const key = await wrappingKey(
      x25519.getSharedSecret(ephemeral.secretKey, encPublicKey),
    );
    const nonce = crypto.getRandomValues(new Uint8Array(NONCE_LENGTH));
    const sealed = new Uint8Array(
      await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: nonce,
          additionalData: entry.slice(0, EPHEMERAL_KEY_OFFSET),
          tagLength: AEAD_TAG_BITS,
        },
        key,
        plaintext,
      ),
    );
    entry.set(ephemeral.publicKey, EPHEMERAL_KEY_OFFSET);
    entry.set(nonce, NONCE_OFFSET);
    entry.set(sealed.subarray(PLAINTEXT_LENGTH), TAG_OFFSET);
    entry.set(sealed.subarray(0, PLAINTEXT_LENGTH), CIPHERTEXT_OFFSET);
    return entry;
  } finally {
    ephemeral.secretKey.fill(0);
    plaintext.fill(0);
  }
};

/**
 * Opens an InboxEntry v1 with the account encryption secret. Resolves the
 * coin the entry describes, or null for an entry the inbox walk must skip
 * rather than fail on: one of another length, version or suite, one
 * sealed towards another key, or one whose authentication fails. The
 * contract accepts any bytes from anyone, so a null is noise, not an
 * error.
 */
export const openInboxEntry = async (
  encSecret: Uint8Array,
  entry: Uint8Array,
): Promise<ShieldedCoin | null> => {
  if (
    entry.length !== INBOX_ENTRY_LENGTH ||
    entry[0] !== ENTRY_VERSION ||
    entry[1] !== ENTRY_SUITE
  ) {
    return null;
  }
  try {
    const key = await wrappingKey(
      x25519.getSharedSecret(
        encSecret,
        entry.slice(EPHEMERAL_KEY_OFFSET, NONCE_OFFSET),
      ),
    );
    const sealed = new Uint8Array(PLAINTEXT_LENGTH + TAG_LENGTH);
    sealed.set(
      entry.slice(CIPHERTEXT_OFFSET, CIPHERTEXT_OFFSET + PLAINTEXT_LENGTH),
      0,
    );
    sealed.set(entry.slice(TAG_OFFSET, CIPHERTEXT_OFFSET), PLAINTEXT_LENGTH);
    const plaintext = new Uint8Array(
      await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: entry.slice(NONCE_OFFSET, TAG_OFFSET),
          additionalData: entry.slice(0, EPHEMERAL_KEY_OFFSET),
          tagLength: AEAD_TAG_BITS,
        },
        key,
        sealed,
      ),
    );
    try {
      return decodeCoin(plaintext);
    } finally {
      plaintext.fill(0);
    }
  } catch {
    return null;
  }
};
