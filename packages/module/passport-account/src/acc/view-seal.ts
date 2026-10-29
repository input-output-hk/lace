import { ByteArray, HexBytes } from '@lace-lib/util';
import { x25519 } from '@noble/curves/ed25519.js';

import type { AccAddress, GrantId } from '@lace-contract/passport';

/**
 * The fixed length of a GrantViewSeal v1, the container the scoped grants
 * standard delivers an account encryption secret in: a version, a suite,
 * the ephemeral X25519 public key, the AEAD nonce and tag, and the sealed
 * 32-byte secret.
 */
export const GRANT_VIEW_SEAL_LENGTH = 94;

const SEAL_VERSION = 0x01;
const SEAL_SUITE = 0x01;
const EPHEMERAL_KEY_OFFSET = 2;
const NONCE_OFFSET = 34;
const TAG_OFFSET = 46;
const CIPHERTEXT_OFFSET = 62;
const NONCE_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const SECRET_LENGTH = 32;
const AEAD_TAG_BITS = TAG_LENGTH * 8;
const VIEW_KEY_INFO = new TextEncoder().encode(
  'midnight:account:grant:view:v1',
);

/** What a seal is bound to beyond the read key: the grant and its account. */
export type GrantViewSealBinding = {
  grantId: GrantId;
  account: AccAddress;
  /** The grantee's X25519 public key, as 32-byte lowercase hex. */
  readPublicKey: string;
};

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

/**
 * The AES-256-GCM key that wraps one seal: HKDF-SHA256 over the X25519
 * shared secret with an empty salt and the view label followed by the
 * grant id, imported non-extractable; the shared secret is zeroed once
 * the key is derived.
 */
const sealingKey = async (
  shared: Uint8Array,
  grantId: Uint8Array,
): Promise<CryptoKey> => {
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
        info: concat(VIEW_KEY_INFO, grantId),
      },
      material,
      { name: 'AES-GCM', length: KEY_LENGTH * 8 },
      false,
      ['encrypt'],
    );
  } finally {
    shared.fill(0);
  }
};

/**
 * Seals an account encryption secret towards a grantee's read key as a
 * GrantViewSeal v1: the secret is wrapped under a key agreed between a
 * fresh ephemeral X25519 key and the read key and derived with the grant
 * id in its label, with the version, suite, ephemeral key, grant id and
 * account as associated data, so the container opens only for that read
 * key, under that grant and for that account. A read key of small order
 * yields an all-zero shared secret, which the key agreement refuses. The
 * ephemeral secret is zeroed before this returns; the account secret is
 * the caller's to zero.
 */
export const sealGrantView = async (
  encSecret: Uint8Array,
  { grantId, account, readPublicKey }: GrantViewSealBinding,
): Promise<Uint8Array> => {
  if (encSecret.length !== SECRET_LENGTH) {
    throw new Error(
      `A grant view seals a ${SECRET_LENGTH}-byte secret, got ${encSecret.length} bytes.`,
    );
  }
  const grantIdBytes = ByteArray.fromHex(HexBytes(grantId));
  const accountBytes = ByteArray.fromHex(HexBytes(account));
  const readKey = ByteArray.fromHex(HexBytes(readPublicKey));
  const ephemeral = x25519.keygen();
  const seal = new Uint8Array(GRANT_VIEW_SEAL_LENGTH);
  seal[0] = SEAL_VERSION;
  seal[1] = SEAL_SUITE;
  seal.set(ephemeral.publicKey, EPHEMERAL_KEY_OFFSET);
  try {
    const key = await sealingKey(
      x25519.getSharedSecret(ephemeral.secretKey, readKey),
      grantIdBytes,
    );
    const nonce = crypto.getRandomValues(new Uint8Array(NONCE_LENGTH));
    const sealed = new Uint8Array(
      await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: nonce,
          additionalData: concat(
            seal.slice(0, NONCE_OFFSET),
            grantIdBytes,
            accountBytes,
          ),
          tagLength: AEAD_TAG_BITS,
        },
        key,
        encSecret as Uint8Array<ArrayBuffer>,
      ),
    );
    seal.set(nonce, NONCE_OFFSET);
    seal.set(sealed.subarray(SECRET_LENGTH), TAG_OFFSET);
    seal.set(sealed.subarray(0, SECRET_LENGTH), CIPHERTEXT_OFFSET);
    return seal;
  } finally {
    ephemeral.secretKey.fill(0);
  }
};
