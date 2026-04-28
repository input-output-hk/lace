import * as ecc from '@bitcoinerlab/secp256k1';
import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import { describe, expect, it } from 'vitest';

import { bip322SignData } from '../../src/signing/bip322-sign-data';

import type { BitcoinSignDataRequest } from '@lace-contract/bitcoin-context';

bitcoin.initEccLib(ecc);
const ECPair = ECPairFactory(ecc);

// BIP-322 specification test vectors
// Private key: L3VFeEujGtevx9w18HD1fhRbCH67Az2dpCymeRE1SoPK6XQtaN2k (WIF)
// Address: bc1q9vza2e8x573nczrlzms0wvx3gsqjx7vavgkx0l (P2WPKH mainnet)
const TEST_PRIVATE_KEY_WIF =
  'L3VFeEujGtevx9w18HD1fhRbCH67Az2dpCymeRE1SoPK6XQtaN2k';
const TEST_ADDRESS = 'bc1q9vza2e8x573nczrlzms0wvx3gsqjx7vavgkx0l';

const testKeyPair = ECPair.fromWIF(
  TEST_PRIVATE_KEY_WIF,
  bitcoin.networks.bitcoin,
);
const TEST_PRIVATE_KEY = Buffer.from(testKeyPair.privateKey!);
const TEST_PUBLIC_KEY = Buffer.from(testKeyPair.publicKey);

// Expected signatures from BIP-322 spec (base64-encoded Simple proofs)
const EXPECTED_EMPTY_MESSAGE_SIG_BASE64 =
  'AkcwRAIgM2gBAQqvZX15ZiysmKmQpDrG83avLIT492QBzLnQIxYCIBaTpOaD20qRlEylyxFSeEA2ba9YOixpX8z46TSDtS40ASECx/EgAxlkQpQ9hYjgGu6EBCPMVPwVIVJqO4XCsMvViHI=';
const EXPECTED_HELLO_WORLD_SIG_BASE64 =
  'AkcwRAIgZRfIY3p7/DoVTty6YZbWS71bc5Vct9p9Fia83eRmw2QCICK/ENGfwLtptFluMGs2KsqoNSk89pO7F29zJLUx9a/sASECx/EgAxlkQpQ9hYjgGu6EBCPMVPwVIVJqO4XCsMvViHI=';

// Alternative valid signatures (ECDSA low-S variants, also from BIP-322 spec)
const ALT_EMPTY_MESSAGE_SIG_BASE64 =
  'AkgwRQIhAPkJ1Q4oYS0htvyuSFHLxRQpFAY56b70UvE7Dxazen0ZAiAtZfFz1S6T6I23MWI2lK/pcNTWncuyL8UL+oMdydVgzAEhAsfxIAMZZEKUPYWI4BruhAQjzFT8FSFSajuFwrDL1Yhy';
const ALT_HELLO_WORLD_SIG_BASE64 =
  'AkgwRQIhAOzyynlqt93lOKJr+wmmxIens//zPzl9tqIOua93wO6MAiBi5n5EyAcPScOjf1lAqIUIQtr3zKNeavYabHyR8eGhowEhAsfxIAMZZEKUPYWI4BruhAQjzFT8FSFSajuFwrDL1Yhy';

describe('bip322SignData', () => {
  // Verify signing an empty message produces a valid BIP-322 signature
  // matching one of the two known-good signatures from the BIP-322 specification.
  // Two valid signatures exist because ECDSA has two valid low-S forms per message.
  it('signs empty message matching BIP-322 spec test vector', () => {
    const request: BitcoinSignDataRequest = {
      address: TEST_ADDRESS,
      message: '',
    };

    const result = bip322SignData(
      {
        privateKey: TEST_PRIVATE_KEY,
        publicKey: TEST_PUBLIC_KEY,
        network: bitcoin.networks.bitcoin,
      },
      request,
    );

    const resultBase64 = Buffer.from(result.signature, 'hex').toString(
      'base64',
    );

    expect([
      EXPECTED_EMPTY_MESSAGE_SIG_BASE64,
      ALT_EMPTY_MESSAGE_SIG_BASE64,
    ]).toContain(resultBase64);
  });

  // Verify signing "Hello World" produces a valid BIP-322 signature
  // matching one of the two known-good signatures from the BIP-322 specification.
  it('signs "Hello World" matching BIP-322 spec test vector', () => {
    const request: BitcoinSignDataRequest = {
      address: TEST_ADDRESS,
      message: 'Hello World',
    };

    const result = bip322SignData(
      {
        privateKey: TEST_PRIVATE_KEY,
        publicKey: TEST_PUBLIC_KEY,
        network: bitcoin.networks.bitcoin,
      },
      request,
    );

    const resultBase64 = Buffer.from(result.signature, 'hex').toString(
      'base64',
    );

    expect([
      EXPECTED_HELLO_WORLD_SIG_BASE64,
      ALT_HELLO_WORLD_SIG_BASE64,
    ]).toContain(resultBase64);
  });

  // Verify the returned signature is a valid hex string
  it('returns hex-encoded signature', () => {
    const request: BitcoinSignDataRequest = {
      address: TEST_ADDRESS,
      message: 'test',
    };

    const result = bip322SignData(
      {
        privateKey: TEST_PRIVATE_KEY,
        publicKey: TEST_PUBLIC_KEY,
        network: bitcoin.networks.bitcoin,
      },
      request,
    );

    expect(result.signature).toMatch(/^[\da-f]+$/);
  });

  // Verify the BIP-322 Simple proof witness structure:
  // The decoded signature must contain exactly 2 witness items —
  // the ECDSA signature (with SIGHASH_ALL appended) and the 33-byte compressed public key.
  // The public key in the witness must hash to the P2WPKH address used for signing.
  it('produces witness containing ECDSA signature and compressed public key', () => {
    const request: BitcoinSignDataRequest = {
      address: TEST_ADDRESS,
      message: 'witness structure test',
    };

    const result = bip322SignData(
      {
        privateKey: TEST_PRIVATE_KEY,
        publicKey: TEST_PUBLIC_KEY,
        network: bitcoin.networks.bitcoin,
      },
      request,
    );

    // Decode the BIP-322 Simple proof — it is a serialized witness stack.
    // First byte is the number of witness items, followed by varint-length-prefixed items.
    const witnessBytes = Buffer.from(result.signature, 'hex');

    // The witness is encoded as: <item_count> <len1> <item1> <len2> <item2>
    // For P2WPKH: item_count=2, item1=ECDSA sig (70-73 bytes), item2=pubkey (33 bytes)
    const itemCount = witnessBytes[0];
    expect(itemCount).toBe(2);

    // Extract witness items
    let offset = 1;
    const sigLength = witnessBytes[offset];
    offset++;
    const sigBytes = witnessBytes.subarray(offset, offset + sigLength);
    offset += sigLength;

    const pubKeyLength = witnessBytes[offset];
    offset++;
    const pubKeyBytes = witnessBytes.subarray(offset, offset + pubKeyLength);

    // Signature ends with SIGHASH_ALL (0x01)
    expect(sigBytes[sigBytes.length - 1]).toBe(0x01);

    // Public key is 33 bytes (compressed)
    expect(pubKeyBytes.length).toBe(33);

    // Public key hashes to the signing address.
    // P2WPKH address = bech32(HASH160(compressed_pubkey))
    const { address: derivedAddress } = bitcoin.payments.p2wpkh({
      pubkey: Buffer.from(pubKeyBytes),
      network: bitcoin.networks.bitcoin,
    });
    expect(derivedAddress).toBe(TEST_ADDRESS);
  });
});
