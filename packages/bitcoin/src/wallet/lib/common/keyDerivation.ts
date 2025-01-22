import * as crypto from 'crypto';
import { HDKey } from '@scure/bip32';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { AddressType } from './address';

bitcoin.initEccLib(ecc);

/**
 * Enum representing the type of address chain in hierarchical deterministic wallets.
 *
 * HD wallets (BIP-32/44/49/84) organize keys into two types of chains:
 * - **External**: Used for receiving addresses (visible to others).
 * - **Internal**: Used for change addresses (to send transaction change back to the wallet).
 */
export enum ChainType {
  /**
   * External chain (receiving addresses).
   * Derivation Path: m / purpose' / coin_type' / account' / 0 / index
   */
  External = 'external',

  /**
   * Internal chain (change addresses).
   * Derivation Path: m / purpose' / coin_type' / account' / 1 / index
   */
  Internal = 'internal',
}

/**
 * Represents the derivation paths for different Bitcoin address types.
 *
 * Hierarchical deterministic wallets (HD wallets) use standardized derivation paths
 * to organize keys and addresses in a predictable way. These paths follow specific
 * BIPs (Bitcoin Improvement Proposals) for compatibility across wallets.
 *
 * Key Standards:
 * - **BIP-44**: Legacy addresses (P2PKH).
 * - **BIP-49**: SegWit-compatible addresses (P2SH-P2WPKH).
 * - **BIP-84**: Native SegWit addresses (P2WPKH).
 * - **BIP-86**: Taproot addresses (P2TR).
 * - **Electrum**: Custom path `m/0'` for Native SegWit in Electrum wallets.
 */
const derivationPaths = {
  NativeSegWit: 'm/84\'/0\'/0\'',
  SegWit: 'm/49\'/0\'/0\'',
  Legacy: 'm/44\'/0\'/0\'',
  Taproot: 'm/86\'/0\'/0\'',
  ElectrumNativeSegWit: 'm/0\''
};

/**
 * Represents the derivation paths for different Bitcoin address types.
 *
 * Hierarchical deterministic wallets (HD wallets) use standardized derivation paths
 * to organize keys and addresses in a predictable way. These paths follow specific
 * BIPs (Bitcoin Improvement Proposals) for compatibility across wallets.
 *
 * Key Standards:
 * - **BIP-44**: Legacy addresses (P2PKH).
 * - **BIP-49**: SegWit-compatible addresses (P2SH-P2WPKH).
 * - **BIP-84**: Native SegWit addresses (P2WPKH).
 * - **BIP-86**: Taproot addresses (P2TR).
 * - **Electrum**: Custom path `m/0'` for Native SegWit in Electrum wallets.
 */
const testnetDerivationPaths = {
  NativeSegWit: 'm/84\'/1\'/0\'',
  SegWit: 'm/49\'/1\'/0\'',
  Legacy: 'm/44\'/1\'/0\'',
  Taproot: 'm/86\'/1\'/0\'',
  ElectrumNativeSegWit: 'm/0\''
};

/**
 * Derives a BIP-39-compatible seed from the given mnemonic and optional passphrase.
 *
 * @param {string} mnemonic - The BIP-39 mnemonic phrase (12, 15, 18, 21, or 24 words).
 * @param {string} [passphrase=''] - An optional passphrase for seed derivation (default is an empty string).
 * @returns {Buffer} The derived 64-byte BIP-39-compatible seed.
 *
 * @example
 * const mnemonic = 'ranch someone rely gasp where sense plug trust salmon stand result parade';
 * const seed = deriveBip39Seed(mnemonic);
 * console.log(seed.toString('hex'));
 */
export const deriveBip39Seed = (mnemonic: string, passphrase: string = ''): Buffer => {
  const salt = `mnemonic${passphrase}`;
  return crypto.pbkdf2Sync(mnemonic, salt, 2048, 64, 'sha512');
};

/**
 * Derives the Electrum-compatible seed from the given mnemonic and optional password.
 *
 * Electrum predates the introduction of BIP-39 and uses a custom seed derivation method that differs
 * from the standard BIP-39 process.
 *
 * Instead of generating the seed using the BIP-39 standard, Electrum derives its seed using the
 * PBKDF2-SHA512 algorithm with 2048 iterations and a custom salt.
 *
 * @param {string} mnemonic - The Electrum-compatible mnemonic phrase (12 or more words).
 * @param {string} [password=''] - An optional password to strengthen the seed derivation (default is an empty string).
 * @returns {Buffer} The derived 64-byte Electrum-compatible seed.
 *
 * @example
 * const mnemonic = 'ranch someone rely gasp where sense plug trust salmon stand result parade';
 * const seed = deriveElectrumSeed(mnemonic);
 * console.log(seed.toString('hex'));
 */
export const deriveElectrumSeed = (mnemonic: string, password: string = ''): Buffer => {
  const salt = `electrum${password}`;
  return crypto.pbkdf2Sync(mnemonic, salt, 2048, 64, 'sha512');
};

/**
 * Represents a derived key pair consisting of a public key and a private key.
 */
export type KeyPair = {
  publicKey: Buffer;
  privateKey: Buffer;
};

/**
 * Derives the key pair (public and private keys) for the specified address type, chain, and index.
 *
 * This function generates a hierarchical deterministic (HD) key pair based on the specified derivation path,
 * which follows Bitcoin standards (BIP-44, BIP-49, BIP-84, BIP-86) or Electrum's custom derivation scheme.
 *
 * @param {Buffer} seed - The master seed derived from the mnemonic phrase.
 * @param {AddressType} addressType - The address type (Legacy, SegWit, NativeSegWit, Taproot, ElectrumNativeSegWit).
 * @param {ChainType} chain - The chain type (`external` for receiving addresses, `internal` for change addresses).
 * @param {number} index - The index of the address to derive (e.g., 0 for the first address).
 * @returns {KeyPair} An object containing the derived public key and private key.
 *
 * @throws {Error} If the private key cannot be derived (e.g., for a hardened path).
 */
export const deriveKeyPair = (
  seed: Buffer,
  addressType: AddressType,
  chain: ChainType,
  index: number
): { pair: KeyPair, path: string } => {
  const root = HDKey.fromMasterSeed(seed);

  const chainPath = chain === ChainType.External ? `0` : `1`;

  const paths = bitcoin.networks.testnet ? testnetDerivationPaths : derivationPaths;
  const path = `${paths[addressType]}/${chainPath}/${index}`;

  const childNode = root.derive(path);

  if (!childNode.privateKey) {
    throw new Error('Failed to derive private key');
  }

  return {
    pair: {
      publicKey: Buffer.from(childNode.publicKey as any),
      privateKey: Buffer.from(childNode.privateKey as any)
    }, path
  };
};

/**
 * Derives the public key for the specified address type, chain, and index.
 *
 * This function uses hierarchical deterministic (HD) derivation paths based on the Bitcoin standards
 * (BIP-44, BIP-49, BIP-84, BIP-86) and Electrum's custom derivation scheme.
 *
 * @param {Buffer} seed - The master seed derived from the mnemonic phrase.
 * @param {AddressType} addressType - The address type (Legacy, SegWit, NativeSegWit, Taproot, ElectrumNativeSegWit).
 * @param {ChainType} chain - The chain type (`external` for receiving addresses or `internal` for change addresses).
 * @param {number} index - The index of the address to derive (e.g., 0 for the first address).
 * @returns The derived public key and the derivation path.
 */
export const derivePublicKey = (
  seed: Buffer,
  addressType: AddressType,
  chain: ChainType,
  index: number
): { pubkey: Buffer, path: string } => {
  const result = deriveKeyPair(seed, addressType, chain, index);
  return { pubkey: result.pair.publicKey, path: result.path };
};

/**
 * Derives the private key for the specified address type, chain, and index.
 *
 * This function generates a hierarchical deterministic (HD) private key based on the specified
 * derivation path, which follows Bitcoin standards (BIP-44, BIP-49, BIP-84, BIP-86) or Electrum's custom derivation scheme.
 *
 * @param {Buffer} seed - The master seed derived from the mnemonic phrase.
 * @param {AddressType} addressType - The address type (Legacy, SegWit, NativeSegWit, Taproot, ElectrumNativeSegWit).
 * @param {ChainType} chain - The chain type (`external` for receiving addresses, `internal` for change addresses).
 * @param {number} index - The index of the address to derive (e.g., 0 for the first address).
 * @returns The derived private key and the derivation path.
 */
export const derivePrivateKey = (
  seed: Buffer,
  addressType: AddressType,
  chain: ChainType,
  index: number
): { privateKey: Buffer, path: string } => {
  const keyPair = deriveKeyPair(seed, addressType, chain, index);
  return { privateKey: keyPair.pair.privateKey, path: keyPair.path };
};