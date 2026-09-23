import { x25519 } from '@noble/curves/ed25519.js';

/** Byte length of a raw X25519 key, public or secret. */
const ENC_KEY_LENGTH = 32;

/**
 * Source of cryptographic randomness: returns `length` fresh random bytes.
 * Injected so tests can fix the bytes; defaults to Web Crypto.
 */
export type RandomBytes = (length: number) => Uint8Array;

/**
 * The account's X25519 encryption keypair. The public key is what the
 * Account Custody Contract constructor stores and advertises on-ledger as
 * `enc_key`, so senders can seal inbox entries towards the account; the
 * secret key is the viewing capability that opens them. Neither key is
 * ever derived from a device key: rotating or losing a device leaves the
 * inbox readable.
 */
export type EncKeyPair = {
  /** Raw 32-byte X25519 public key, the contract's `enc_key`. */
  publicKey: Uint8Array;
  /** Raw 32-byte X25519 secret key, the inbox viewing capability. */
  secretKey: Uint8Array;
};

export type GenerateEncKeyPairOptions = {
  /** Randomness for the secret key; defaults to Web Crypto. */
  randomBytes?: RandomBytes;
};

const defaultRandomBytes: RandomBytes = length =>
  crypto.getRandomValues(new Uint8Array(length));

/**
 * Generates a fresh account encryption keypair: a random 32-byte X25519
 * secret and its RFC 7748 public key. The secret is stored raw and
 * clamped only at use, so the pair is interoperable with any RFC 7748
 * implementation.
 */
export const generateEncKeyPair = ({
  randomBytes = defaultRandomBytes,
}: GenerateEncKeyPairOptions = {}): EncKeyPair => {
  const secretKey = randomBytes(ENC_KEY_LENGTH);
  return { publicKey: x25519.getPublicKey(secretKey), secretKey };
};
