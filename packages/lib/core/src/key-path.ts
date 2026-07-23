/**
 * BIP32-Ed25519 soft (non-hardened) public-child key derivation — CIP-1852, via
 * `@cardano-sdk/crypto`'s `SodiumBip32Ed25519` through the `@lace-lib/vendor` seam
 * (ADR 37).
 *
 * From an account-level extended public key (xpub = the m/1852'/1815'/account' node)
 * this derives the raw Ed25519 public key (hex) at role/index. **Async** because the
 * libsodium-backed derivation requires async initialisation (`SodiumBip32Ed25519.create`);
 * the purpose/account levels are hardened and already baked into the xpub, so only
 * `role` and `index` participate here.
 */
import { Crypto, KeyRole } from '@lace-lib/vendor';

export { KeyRole };

/**
 * Derive the raw Ed25519 public key (hex) at `role`/`index` from an account extended
 * public key (xpub, hex). The Tagged `Ed25519PublicKeyHex` in/out lets the result feed
 * `hashEd25519PublicKey` (and other SDK APIs) with no intermediate cast (ADR 13).
 */
export const deriveBip32PublicKey = async (
  accountXpubHex: Crypto.Bip32PublicKeyHex,
  role: number,
  index: number,
): Promise<Crypto.Ed25519PublicKeyHex> => {
  const bip32Ed25519 = await Crypto.SodiumBip32Ed25519.create();
  const childKey = bip32Ed25519.derivePublicKey(accountXpubHex, [role, index]);
  return bip32Ed25519.getRawPublicKey(childKey);
};
