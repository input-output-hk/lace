import { pbkdf2Sync } from 'pbkdf2';
import { HDKey } from '@scure/bip32';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from '@bitcoinerlab/secp256k1';
import { AddressType } from './address';
import { Network } from './network';

bitcoin.initEccLib(ecc);

const ADDRESS_TYPE_TO_PURPOSE: Record<AddressType, number> = {
  [AddressType.Legacy]: 44,
  [AddressType.SegWit]: 49,
  [AddressType.NativeSegWit]: 84,
  [AddressType.Taproot]: 86,
  [AddressType.ElectrumNativeSegWit]: 0,
};

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
  return pbkdf2Sync(mnemonic, salt, 2048, 64, 'sha512');
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
  return pbkdf2Sync(mnemonic, salt, 2048, 64, 'sha512');
};

/**
 * Represents a derived key pair consisting of a public key and a private key.
 */
export type KeyPair = {
  publicKey: Buffer;
  privateKey: Buffer;
};

/**
 * Derives the account-level (root) key pair from the given master seed.
 *
 * This function derives the account-level using the derivation path:
 *
 *    m / purpose' / coin_type' / account'
 *
 * where:
 * - `purpose` is determined by the address type (e.g., 84 for NativeSegWit, 49 for SegWit, 44 for Legacy, etc.)
 * - `coin_type` comes from the network object (0 for mainnet and 1 for testnet).
 * - `account` is the account index.
 *
 * For example, for a Native SegWit wallet on Bitcoin mainnet with account 0, the derivation path would be:
 *    m/84'/0'/0'
 *
 * @param {Buffer} seed - The master seed derived from the mnemonic.
 * @param {AddressType} addressType - The address type (e.g., Legacy, SegWit, NativeSegWit, Taproot, ElectrumNativeSegWit).
 * @param {Network} network - The network (mainnet or testnet).
 * @param {number} account - The account index.
 * @returns {{ pair: KeyPair, path: string }} An object containing the derived account-level key pair and the derivation path.
 * @throws {Error} If the account-level private or public key cannot be derived.
 */
export const deriveRootKeyPair = (seed: Buffer, addressType: AddressType, network: Network, account: number) => {
  const root = HDKey.fromMasterSeed(seed);
  const networkIndex = network === Network.Mainnet ? 0 : 1;
  const accountPath = `m/${ADDRESS_TYPE_TO_PURPOSE[addressType]}'/${networkIndex}'/${account}'`;
  const accountNode = root.derive(accountPath);

  if (!accountNode.privateKey) {
    throw new Error('Failed to derive account-level private key');
  }

  if (!accountNode.publicKey) {
    throw new Error('Failed to derive account-level public key');
  }

  return {
    pair: {
      publicKey: Buffer.from(accountNode.publicKey),
      privateKey: Buffer.from(accountNode.privateKey)
    },
    path: accountPath
  };
};

/**
 * Derives a child key pair from the account-level HD key.
 *
 * This function derives a child key for a specific chain (external for receiving or internal for change)
 * and index, based on the account-level extended key. The chain is determined by using '0' for external addresses and
 * '1' for internal addresses.
 *
 * @param {Buffer} accountKey - The account-level extended key (HDKey) as a Buffer.
 * @param {ChainType} chain - The chain type (external for receiving, internal for change).
 * @param {number} index - The index of the child key to derive.
 * @returns {{ pair: KeyPair, path: string }} An object containing the derived child key pair and its derivation path.
 * @throws {Error} If the child private key cannot be derived.
 */
export const deriveChildKeyPair = (accountKey: Buffer, chain: ChainType, index: number) => {
  const hdAccountKey = HDKey.fromExtendedKey(accountKey.toString('hex'));
  const chainPath = chain === ChainType.External ? '0' : '1';
  const fullPath = `${chainPath}/${index}`;
  const childNode = hdAccountKey.derive(fullPath);
  if (!childNode.privateKey) {
    throw new Error('Failed to derive child private key');
  }

  if (!childNode.publicKey) {
    throw new Error('Failed to derive child public key');
  }

  return {
    pair: {
      publicKey: Buffer.from(childNode.publicKey),
      privateKey: Buffer.from(childNode.privateKey)
    },
    path: fullPath
  };
};

/**
 * Derives a child public key from a given extended public key using non-hardened derivation.
 *
 * This function allows deriving a child public key without requiring the private key.
 * It accepts an extended public key (as a Buffer) and a relative derivation path (e.g. "0/0")
 * for non-hardened derivation. If derivation is successful, it returns the child public key.
 *
 * @param {Buffer} extendedPublicKey - The extended public key as a Buffer.
 * @param {ChainType} chain - The chain type (external for receiving, internal for change).
 * @param {number} index - The index of the child key to derive.
 * @returns {Buffer} The derived child public key.
 * @throws {Error} If the child public key cannot be derived.
 */
export const deriveChildPublicKey = (extendedPublicKey: Buffer, chain: ChainType, index: number): Buffer => {
  const hdKey = HDKey.fromExtendedKey(extendedPublicKey.toString('hex'));
  const chainPath = chain === ChainType.External ? '0' : '1';
  const relativePath = `${chainPath}/${index}`;
  const childNode = hdKey.derive(relativePath);

  if (!childNode.publicKey) {
    throw new Error('Failed to derive child public key');
  }

  return Buffer.from(childNode.publicKey);
};
