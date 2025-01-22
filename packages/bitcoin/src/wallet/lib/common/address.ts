import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';

bitcoin.initEccLib(ecc);

/**
 * Enum representing different Bitcoin address types.
 *
 * Bitcoin supports multiple address formats, each optimized for different use cases, including backward compatibility,
 * SegWit improvements, and modern Taproot addresses. This enum standardizes the available address types,
 * including a specific type used by Electrum for Native SegWit.
 */
export enum AddressType {
  /**
   * Legacy P2PKH (Pay-to-Public-Key-Hash). The original Bitcoin address format, used before SegWit.
   *
   * Starts with `1` (e.g., `1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa`).
   */
  Legacy = 'Legacy',

  /**
   * SegWit P2SH-P2WPKH (Pay-to-Script-Hash wrapped SegWit). A backward-compatible SegWit address format wrapped
   * in a P2SH script.
   *
   * Starts with `3` (e.g., `3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy`).
   */
  SegWit = 'SegWit',

  /**
   * Native SegWit P2WPKH (Pay-to-Witness-Public-Key-Hash) address format, lowest fees for SegWit transactions due to
   * reduced transaction size.
   *
   * Not compatible with very old wallets or tools that do not support Bech32 addresses.
   *
   * Starts with `bc1q` (e.g., `bc1qw508d6qe...`).
   */
  NativeSegWit = 'NativeSegWit',

  /**
   * Taproot P2TR (Pay-to-Taproot) address format introduced in Bitcoin's Taproot upgrade. Supports advanced scripting, improved privacy,
   * and further reduced transaction fees.
   *
   * Starts with `bc1p` (e.g., `bc1p5cyxnux...`).
   */
  Taproot = 'Taproot',

  /**
   * Electrum's implementation of Native SegWit uses a custom derivation scheme, with `m/0'` as the root path instead
   * of the BIP-84 standard `m/84'/0'/0'`. Is not directly compatible with other wallets that expect standard BIP-84 paths.
   *
   * Starts with `bc1q` (similar to Native SegWit).
   */
  ElectrumNativeSegWit = 'ElectrumNativeSegWit',
}

/**
 * Derives a Bitcoin address from the given public key and address type.
 *
 * Bitcoin supports multiple address formats, each optimized for different use cases,
 * such as backward compatibility, SegWit efficiency, and Taproot privacy enhancements.
 * This function derives the appropriate Bitcoin address based on the specified address type.
 *
 * @param {Buffer} publicKey - The public key (compressed, 33 bytes).
 * @param {AddressType} addressType - The address type (Legacy, SegWit, NativeSegWit, Taproot, ElectrumNativeSegWit).
 * @param {bitcoin.networks.Network} network - The Bitcoin network (e.g., `bitcoin.networks.bitcoin` for mainnet or `bitcoin.networks.testnet`).
 * @returns {string} The derived Bitcoin address as a string.
 *
 * @throws {Error} If an unsupported address type is provided.
 */
export const deriveAddressByType = (
  publicKey: Buffer,
  addressType: AddressType,
  network: bitcoin.networks.Network
): string => {
  // Ensure the public key is a Buffer
  const pubkeyBuffer = Buffer.from(publicKey);

  switch (addressType) {
    /**
     * **Legacy (P2PKH)**: Pay-to-Public-Key-Hash
     * - Address format: Starts with `1`.
     * - Example: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
     */
    case AddressType.Legacy:
      return bitcoin.payments.p2pkh({ pubkey: pubkeyBuffer, network }).address!;

    /**
     * **SegWit (P2SH-P2WPKH)**: Pay-to-Script-Hash wrapped SegWit
     * - Address format: Starts with `3`.
     * - Example: 3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy
     */
    case AddressType.SegWit:
      return bitcoin.payments.p2sh({
        redeem: bitcoin.payments.p2wpkh({ pubkey: pubkeyBuffer, network }),
        network
      }).address!;

    /**
     * **NativeSegWit (P2WPKH)**: Native Pay-to-Witness-Public-Key-Hash
     * - Address format: Starts with `bc1q`.
     * - Example: bc1qw508d6qejxtdg4y5r3zarvaryvaxxpcs
     */
    case AddressType.NativeSegWit:
    case AddressType.ElectrumNativeSegWit: // Electrum uses the same format but different derivation paths
      return bitcoin.payments.p2wpkh({ pubkey: pubkeyBuffer, network }).address!;

    /**
     * **Taproot (P2TR)**: Pay-to-Taproot
     * - Address format: Starts with `bc1p`.
     * - Example: bc1p5cyxnuxmeuwuvkwfem96l4rze9x9z7g03pzhj
     *
     * Taproot requires the "x-only" public key, which is the 32-byte version of the public key.
     * The first byte (prefix) of the compressed public key is removed.
     */
    case AddressType.Taproot: {
      // Convert compressed public key to x-only public key (strip the first byte)
      const xOnlyPubKey = pubkeyBuffer.slice(1); // Remove the first byte (0x02 or 0x03)
      return bitcoin.payments.p2tr({ pubkey: xOnlyPubKey, network }).address!;
    }

    default:
      throw new Error(`Unsupported address type: ${addressType}`);
  }
};

/**
 * Represents a Bitcoin address and its corresponding derivation path.
 *
 * In hierarchical deterministic (HD) wallets, Bitcoin addresses are derived
 * systematically using derivation paths. Each path uniquely identifies a specific
 * address in the wallet's key hierarchy.
 */
export type DerivedAddress = {
  /** The derived Bitcoin address, e.g., 'bc1qxyz...' or '1A1zP1e...' */
  address: string;

  /** The address type used to derive the address, e.g., 'NativeSegWit' or 'Legacy' */
  addressType: AddressType;

  /** The derivation path used to derive the address, e.g., "m/84'/0'/0'/0/0" */
  derivationPath: string;
};