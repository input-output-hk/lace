import * as ecc from '@bitcoinerlab/secp256k1';

import type {
  KeyPair,
  SignedTransaction,
  UnsignedTransaction,
} from '../common';
import type { Signer } from 'bitcoinjs-lib';

export class BitcoinSigner implements Signer {
  public readonly publicKey: Buffer;

  /**
   * Creates a new CustomSigner instance.
   * @param keyPair - The key pair to use for signing.
   */
  public constructor(private readonly keyPair: KeyPair) {
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
  public sign(hash: Buffer, _lowR = false): Buffer {
    if (hash.length !== 32) {
      throw new Error('Hash must be 32 bytes.');
    }

    const signature = ecc.sign(
      new Uint8Array(hash),
      new Uint8Array(this.keyPair.privateKey),
    );
    return Buffer.from(signature);
  }

  /**
   * Returns the public key.
   * @returns {Buffer} The public key as a buffer.
   */
  public getPublicKey(): Buffer {
    return this.publicKey;
  }

  /**
   * Clears the private key from memory.
   *
   * This is a security measure to prevent the private key from being exposed in memory.
   */
  public clearSecrets() {
    this.keyPair.privateKey.fill(0);
  }
}

/**
 * Signs a PSBT transaction with multiple Bitcoin signers, each corresponding to a specific input.
 *
 * @param unsignedTx - The PSBT transaction to sign.
 * @param signers - An array of BitcoinSigner instances, where each signer is used for the respective input.
 * @returns The signed transaction containing the signed PSBT and its hexadecimal representation.
 */
export const signTx = (
  unsignedTx: UnsignedTransaction,
  signers: BitcoinSigner[],
): SignedTransaction => {
  const psbt = unsignedTx.context;

  signers.forEach((signer, index) => {
    psbt.signInput(index, signer);
  });

  psbt.finalizeAllInputs();

  return {
    context: psbt,
    hex: psbt.extractTransaction().toHex(),
  };
};
