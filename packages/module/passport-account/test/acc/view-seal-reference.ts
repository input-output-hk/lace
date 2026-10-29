/**
 * A reader of GrantViewSeal v1 written from the scoped grants standard
 * alone, with Web Crypto and a bare X25519, so the module's sealing is
 * checked against the standard's wording rather than against itself.
 */
import { ByteArray, HexBytes } from '@lace-lib/util';
import { x25519 } from '@noble/curves/ed25519.js';

import type { AccAddress, GrantId } from '@lace-contract/passport';

const VERSION = 0x01;
const SUITE = 0x01;
const SEAL_LENGTH = 94;
const INFO = new TextEncoder().encode('midnight:account:grant:view:v1');

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
 * Opens a seal with the grantee's read secret: shared = X25519(sk,
 * eph_pk), key = HKDF-SHA256(shared, empty salt, info || grant_id, 32),
 * AES-256-GCM with the nonce and tag at their offsets and the associated
 * data version || suite || eph_pk || grant_id || account. Rejects when the
 * length, version or suite is off or the authentication fails.
 */
export const openGrantViewSeal = async (
  readSecret: Uint8Array,
  seal: Uint8Array,
  { grantId, account }: { grantId: GrantId; account: AccAddress },
): Promise<Uint8Array> => {
  if (seal.length !== SEAL_LENGTH) throw new Error('not a seal: length');
  if (seal[0] !== VERSION || seal[1] !== SUITE) {
    throw new Error('not a seal: version or suite');
  }
  const ephemeralPublicKey = seal.slice(2, 34);
  const nonce = seal.slice(34, 46);
  const tag = seal.slice(46, 62);
  const ciphertext = seal.slice(62, 94);
  const grantIdBytes = ByteArray.fromHex(HexBytes(grantId));
  const accountBytes = ByteArray.fromHex(HexBytes(account));
  const shared = x25519.getSharedSecret(readSecret, ephemeralPublicKey);
  const material = await crypto.subtle.importKey(
    'raw',
    shared as Uint8Array<ArrayBuffer>,
    'HKDF',
    false,
    ['deriveKey'],
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0),
      info: concat(INFO, grantIdBytes),
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );
  return new Uint8Array(
    await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: nonce,
        additionalData: concat(
          seal.slice(0, 2),
          ephemeralPublicKey,
          grantIdBytes,
          accountBytes,
        ),
        tagLength: 128,
      },
      key,
      concat(ciphertext, tag),
    ),
  );
};

/**
 * The liveness check a delegate runs before it trusts an opened secret:
 * X25519(secret, 9), the public key of the secret, must be the account's
 * `enc_key`.
 */
export const isLiveSecret = (secret: Uint8Array, encKey: Uint8Array): boolean =>
  HexBytes.fromByteArray(x25519.getPublicKey(secret)) ===
  HexBytes.fromByteArray(encKey);
