import * as ecc from '@bitcoinerlab/secp256k1';
import { HexBytes } from '@lace-lib/util';
import * as bitcoin from 'bitcoinjs-lib';

import { varstr } from './varint';

import type {
  BitcoinSignDataRequest,
  BitcoinSignDataResult,
} from '@lace-contract/bitcoin-context';

const MESSAGE_MAGIC = 'Bitcoin Signed Message:\n';

/**
 * Header base for the compact signature: 27 + 4. The +4 marks a compressed
 * public key, giving the 31-34 header range that Unisat and Electrum emit
 * for segwit addresses. BIP-137's bech32 range (39-42) is deliberately not
 * used because many verifiers reject it.
 */
const COMPRESSED_HEADER_BASE = 31;

/**
 * Computes the Bitcoin signed-message digest:
 * sha256d(varstr("Bitcoin Signed Message:\n") || varstr(message)).
 */
const magicHash = (message: string): Buffer =>
  bitcoin.crypto.hash256(
    Buffer.concat([varstr(MESSAGE_MAGIC), varstr(message)]),
  );

export interface Bip137SignMessageParams {
  privateKey: Buffer;
}

/**
 * Signs a message using the BIP-137 compact recoverable ECDSA scheme.
 *
 * Signs the magic hash of the message with RFC 6979 deterministic ECDSA and
 * returns the hex-encoded 65-byte compact signature header || r || s, where
 * header = 27 + recoveryId + 4 (compressed public key).
 */
export const bip137SignMessage = (
  params: Bip137SignMessageParams,
  request: BitcoinSignDataRequest,
): BitcoinSignDataResult => {
  const digest = magicHash(request.message);
  const { signature, recoveryId } = ecc.signRecoverable(
    new Uint8Array(digest),
    new Uint8Array(params.privateKey),
  );
  const compact = Buffer.concat([
    Buffer.from([COMPRESSED_HEADER_BASE + recoveryId]),
    Buffer.from(signature),
  ]);
  return { signature: HexBytes(compact.toString('hex')) };
};
