import * as ecc from '@bitcoinerlab/secp256k1';
import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import { describe, expect, it } from 'vitest';

import { bip137SignMessage } from '../../src/signing/bip137-sign-message';

import type { RecoveryIdType } from '@bitcoinerlab/secp256k1';

bitcoin.initEccLib(ecc);
const ECPair = ECPairFactory(ecc);

const TEST_PRIVATE_KEY_WIF =
  'L3VFeEujGtevx9w18HD1fhRbCH67Az2dpCymeRE1SoPK6XQtaN2k';
const TEST_ADDRESS = 'bc1q9vza2e8x573nczrlzms0wvx3gsqjx7vavgkx0l';

const testKeyPair = ECPair.fromWIF(
  TEST_PRIVATE_KEY_WIF,
  bitcoin.networks.bitcoin,
);
const TEST_PRIVATE_KEY = Buffer.from(testKeyPair.privateKey!);
const TEST_PUBLIC_KEY = Buffer.from(testKeyPair.publicKey);

const MAGIC_BYTES = Buffer.from('Bitcoin Signed Message:\n', 'utf8');
const MAGIC_PREFIX = Buffer.from([0x18]);

const signMessage = (message: string) =>
  bip137SignMessage(
    { privateKey: TEST_PRIVATE_KEY },
    { address: TEST_ADDRESS, message },
  );

const recoverPublicKey = (
  signatureHex: string,
  digest: Buffer,
): Buffer | null => {
  const compact = Buffer.from(signatureHex, 'hex');
  const recoveryId = (compact[0] - 31) as RecoveryIdType;
  const recovered = ecc.recover(
    new Uint8Array(digest),
    new Uint8Array(compact.subarray(1)),
    recoveryId,
    true,
  );
  return recovered ? Buffer.from(recovered) : null;
};

const expectSignatureRecoversSigningKey = (
  signatureHex: string,
  preimage: Buffer,
): void => {
  const digest = bitcoin.crypto.hash256(preimage);
  const recoveredPublicKey = recoverPublicKey(signatureHex, digest);

  expect(recoveredPublicKey).not.toBeNull();
  expect(recoveredPublicKey!.equals(TEST_PUBLIC_KEY)).toBe(true);

  const { address: derivedAddress } = bitcoin.payments.p2wpkh({
    pubkey: recoveredPublicKey!,
    network: bitcoin.networks.bitcoin,
  });
  expect(derivedAddress).toBe(TEST_ADDRESS);
};

describe('bip137SignMessage', () => {
  it('produces a 65-byte compact signature with header in the compressed range 31-34', () => {
    const result = signMessage('Hello World');
    const compact = Buffer.from(result.signature, 'hex');

    expect(result.signature).toMatch(/^[\da-f]+$/);
    expect(compact.length).toBe(65);
    expect(compact[0]).toBeGreaterThanOrEqual(31);
    expect(compact[0]).toBeLessThanOrEqual(34);
  });

  it('signs the hand-built magic-hash preimage so recovery reproduces the signing key', () => {
    const message = 'Hello World';
    const result = signMessage(message);

    const messageBytes = Buffer.from(message, 'utf8');
    const preimage = Buffer.concat([
      MAGIC_PREFIX,
      MAGIC_BYTES,
      Buffer.from([messageBytes.length]),
      messageBytes,
    ]);

    expectSignatureRecoversSigningKey(result.signature, preimage);
  });

  it('signs deterministically per RFC 6979', () => {
    const first = signMessage('determinism check');
    const second = signMessage('determinism check');

    expect(first.signature).toBe(second.signature);
  });

  it('signs the empty message with a zero-length varint prefix', () => {
    const result = signMessage('');

    const preimage = Buffer.concat([
      MAGIC_PREFIX,
      MAGIC_BYTES,
      Buffer.from([0x00]),
    ]);

    expectSignatureRecoversSigningKey(result.signature, preimage);
  });

  it('prefixes a multi-byte UTF-8 message with its byte length, not its character count', () => {
    const message = 'こんにちは';
    const result = signMessage(message);

    const messageBytes = Buffer.from(message, 'utf8');
    expect(messageBytes.length).not.toBe(message.length);

    const preimage = Buffer.concat([
      MAGIC_PREFIX,
      MAGIC_BYTES,
      Buffer.from([messageBytes.length]),
      messageBytes,
    ]);

    expectSignatureRecoversSigningKey(result.signature, preimage);
  });

  it('prefixes messages longer than 252 bytes with a 0xfd uint16 varint', () => {
    const message = 'a'.repeat(300);
    const result = signMessage(message);

    const messageBytes = Buffer.from(message, 'utf8');
    const preimage = Buffer.concat([
      MAGIC_PREFIX,
      MAGIC_BYTES,
      Buffer.from([0xfd, 300 & 0xff, 300 >> 8]),
      messageBytes,
    ]);

    expectSignatureRecoversSigningKey(result.signature, preimage);
  });

  it('prefixes messages longer than 65535 bytes with a 0xfe uint32 varint', () => {
    const length = 0x1_00_01;
    const message = 'b'.repeat(length);
    const result = signMessage(message);

    const messageBytes = Buffer.from(message, 'utf8');
    const lengthPrefix = Buffer.alloc(5);
    lengthPrefix[0] = 0xfe;
    lengthPrefix.writeUInt32LE(length, 1);
    const preimage = Buffer.concat([
      MAGIC_PREFIX,
      MAGIC_BYTES,
      lengthPrefix,
      messageBytes,
    ]);

    expectSignatureRecoversSigningKey(result.signature, preimage);
  });
});
