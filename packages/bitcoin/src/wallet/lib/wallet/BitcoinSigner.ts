import { Signer } from 'bitcoinjs-lib';
import { KeyPair } from '../common';
import * as ecc from 'tiny-secp256k1';

export class BitcoinSigner implements Signer {
  publicKey: Buffer;

  /**
   * Creates a new CustomSigner instance.
   * @param keyPair - The key pair to use for signing.
   */
  constructor(private keyPair: KeyPair) {
    if (!keyPair.privateKey) {
      throw new Error('Private key is required to sign transactions.');
    }
    this.publicKey = keyPair.publicKey;
  }

  /**
   * Signs a hash using tiny-secp256k1's sign function.
   * @param {Buffer} hash - The hash to sign (must be 32 bytes).
   * @param {boolean} _lowR - Optional flag for lowR signatures (ignored here).
   * @returns {Buffer} The signature as a buffer.
   */
  sign(hash: Buffer, _lowR: boolean = false): Buffer {
    if (hash.length !== 32) {
      throw new Error('Hash must be 32 bytes.');
    }

    const signature = ecc.sign(new Uint8Array(hash), new Uint8Array(this.keyPair.privateKey));
    return Buffer.from(signature);
  }

  /**
   * Returns the public key.
   * @returns {Buffer} The public key as a buffer.
   */
  getPublicKey(): Buffer {
    return this.publicKey;
  }

  /**
   * Clears the private key from memory.
   *
   * This is a security measure to prevent the private key from being exposed in memory.
   */
  clearSecrets() {
    this.keyPair.privateKey.fill(0);
  }
}