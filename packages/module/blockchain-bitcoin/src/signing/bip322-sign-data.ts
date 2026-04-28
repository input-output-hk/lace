import * as ecc from '@bitcoinerlab/secp256k1';
import { HexBytes } from '@lace-sdk/util';
import * as bitcoin from 'bitcoinjs-lib';

import type {
  BitcoinSignDataRequest,
  BitcoinSignDataResult,
} from '@lace-contract/bitcoin-context';

bitcoin.initEccLib(ecc);

const BIP322_TAG = 'BIP0322-signed-message';

/**
 * Computes the BIP-322 tagged message hash.
 *
 * Uses BIP-340 tagged hashing: SHA256(SHA256(tag) || SHA256(tag) || message).
 */
const bip322MessageHash = (message: string): Buffer => {
  const tagHash = bitcoin.crypto.sha256(Buffer.from(BIP322_TAG, 'utf8'));
  const prefix = Buffer.concat([tagHash, tagHash]);
  return bitcoin.crypto.sha256(
    Buffer.concat([prefix, Buffer.from(message, 'utf8')]),
  );
};

/**
 * Builds the BIP-322 virtual "to_spend" transaction.
 *
 * This transaction embeds the message hash in its scriptSig and the
 * signing address's scriptPubKey as its output. It is never broadcast —
 * it exists only to create a spendable output for the "to_sign" transaction.
 */
const buildToSpend = (
  messageHash: Buffer,
  outputScript: Buffer,
): bitcoin.Transaction => {
  const tx = new bitcoin.Transaction();
  tx.version = 0;
  tx.locktime = 0;
  tx.addInput(
    Buffer.alloc(32, 0),
    0xffffffff,
    0,
    Buffer.concat([Buffer.from([0x00, 0x20]), messageHash]),
  );
  tx.addOutput(outputScript, 0);
  return tx;
};

/**
 * Serializes a witness stack into the BIP-322 Simple proof format.
 *
 * Format: <item_count> (<item_length> <item_bytes>)*
 * For P2WPKH: 2 items — ECDSA signature with SIGHASH_ALL and compressed public key.
 */
const serializeWitness = (witness: Buffer[]): Buffer => {
  const parts: Buffer[] = [Buffer.from([witness.length])];
  for (const item of witness) {
    parts.push(Buffer.from([item.length]));
    parts.push(item);
  }
  return Buffer.concat(parts);
};

export interface Bip322SignDataParams {
  privateKey: Buffer;
  publicKey: Buffer;
  network: bitcoin.networks.Network;
}

/**
 * Signs a message using BIP-322 Generic Signed Message Format (P2WPKH Simple proof).
 *
 * Constructs the virtual to_spend/to_sign transaction pair per BIP-322,
 * signs with the provided key using BIP-143 segwit v0 digest, and returns
 * the serialized witness stack as a hex-encoded string.
 */
export const bip322SignData = (
  params: Bip322SignDataParams,
  request: BitcoinSignDataRequest,
): BitcoinSignDataResult => {
  const { privateKey, publicKey, network } = params;
  const messageHash = bip322MessageHash(request.message);
  const outputScript = bitcoin.address.toOutputScript(request.address, network);

  const toSpend = buildToSpend(messageHash, outputScript);

  const psbt = new bitcoin.Psbt({ network });
  psbt.setVersion(0);
  psbt.setLocktime(0);
  psbt.addInput({
    hash: toSpend.getHash(),
    index: 0,
    sequence: 0,
    witnessUtxo: { script: outputScript, value: 0 },
  });
  psbt.addOutput({ script: Buffer.from([0x6a]), value: 0 });

  const signer: bitcoin.Signer = {
    publicKey,
    sign: (hash: Buffer) =>
      Buffer.from(ecc.sign(new Uint8Array(hash), new Uint8Array(privateKey))),
  };

  psbt.signInput(0, signer);
  psbt.finalizeInput(0);

  const witness = psbt.extractTransaction().ins[0].witness;
  const serialized = serializeWitness(witness);

  return { signature: HexBytes(serialized.toString('hex')) };
};
