/**
 * BLAKE2b-224 hash of an Ed25519 public key — the Cardano credential / key-hash form
 * (payment / stake / DRep key hashes), via `@cardano-sdk/crypto`'s
 * `Ed25519PublicKey.hash()` through the `@lace-lib/vendor` seam (ADR 37). The Tagged
 * `Ed25519KeyHashHex` return lets callers consume it without re-wrapping (ADR 13).
 */
import { Crypto } from '@lace-lib/vendor';

export const hashEd25519PublicKey = (
  publicKeyHex: Crypto.Ed25519PublicKeyHex,
): Crypto.Ed25519KeyHashHex =>
  Crypto.Ed25519PublicKey.fromHex(publicKeyHex).hash().hex();
