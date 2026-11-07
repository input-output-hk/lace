import { ByteArray } from '@lace-lib/util';
import {
  verifySignature,
  signatureVerifyingKey,
} from '@midnight-ntwrk/ledger-v8';
import { HDWallet, Roles } from '@midnightntwrk/wallet-sdk/hd';
import { secp256k1 } from '@noble/curves/secp256k1';
import { describe, expect, it } from 'vitest';

import {
  createAccountKeys,
  deriveEcdsaKey,
} from '../../src/store/account-keys';

const seed = () => new Uint8Array(32).fill(1);
const buffers = () =>
  [1, 2, 3, 4].map(n => ByteArray(new Uint8Array(32).fill(n))) as [
    ByteArray,
    ByteArray,
    ByteArray,
    ByteArray,
  ];
const message = new TextEncoder().encode('midnight_signed_message:4:test');

describe('Midnight v2 account keys', () => {
  it('derives ECDSA at role 4, independently of the existing Schnorr identity and account', () => {
    const wallet = HDWallet.fromSeed(seed());
    if (wallet.type !== 'seedOk') throw new Error('Invalid test seed');
    try {
      const schnorr = wallet.hdWallet
        .selectAccount(0)
        .selectRole(Roles.NightExternal)
        .deriveKeyAt(0);
      const ecdsa = wallet.hdWallet
        .selectAccount(0)
        .selectRole(Roles.EcdsaUnshielded)
        .deriveKeyAt(0);
      if (schnorr.type !== 'keyDerived' || ecdsa.type !== 'keyDerived')
        throw new Error('Invalid test derivation');
      expect(deriveEcdsaKey(seed(), 0)).toEqual(ecdsa.key);
      expect(deriveEcdsaKey(seed(), 0)).not.toEqual(schnorr.key);
      expect(deriveEcdsaKey(seed(), 1)).not.toEqual(ecdsa.key);
    } finally {
      wallet.hdWallet.clear();
    }
  });

  it('preserves Schnorr public identity and verifies asynchronous signatures on v8', async () => {
    const owned = buffers();
    const keys = createAccountKeys(owned, 'undeployed');
    try {
      const publicKey = keys.unshieldedKeystore.getPublicKey();
      expect(publicKey).toEqual({
        tag: 'schnorr',
        value: signatureVerifyingKey(Buffer.from(owned[0]).toString('hex')),
      });
      const signature = await keys.unshieldedKeystore.signDataAsync(message);
      expect(signature.tag).toBe('schnorr');
      expect(verifySignature(publicKey.value, message, signature.value)).toBe(
        true,
      );
      expect(
        verifySignature(publicKey.value, new Uint8Array([0]), signature.value),
      ).toBe(false);
    } finally {
      keys.clear();
    }
  });

  it('verifies ECDSA independently with secp256k1/SHA-256 and rejects altered payloads', async () => {
    const keys = createAccountKeys(buffers(), 'undeployed');
    try {
      const key = keys.ecdsaKeystore.getPublicKey();
      const signature = await keys.ecdsaKeystore.signDataAsync(message);
      expect(key.tag).toBe('ecdsa');
      expect(signature.tag).toBe('ecdsa');
      expect(Buffer.from(key.value, 'hex')).toHaveLength(33);
      expect(
        secp256k1.verify(
          Buffer.from(signature.value, 'hex'),
          message,
          Buffer.from(key.value, 'hex'),
          { prehash: true },
        ),
      ).toBe(true);
      expect(
        secp256k1.verify(
          Buffer.from(signature.value, 'hex'),
          new Uint8Array([0]),
          Buffer.from(key.value, 'hex'),
          { prehash: true },
        ),
      ).toBe(false);
    } finally {
      keys.clear();
    }
  });

  it('wipes every owned buffer and revokes retained signing references on clear', async () => {
    const owned = buffers();
    const keys = createAccountKeys(owned, 'undeployed');
    const schnorr = keys.unshieldedKeystore;
    const ecdsa = keys.ecdsaKeystore;
    keys.clear();
    keys.clear();
    expect(owned.every(buffer => buffer.every(byte => byte === 0))).toBe(true);
    expect(() => schnorr.getSecretKey()).toThrow('cleared');
    await expect(schnorr.signDataAsync(message)).rejects.toThrow('cleared');
    await expect(ecdsa.signDataAsync(message)).rejects.toThrow('cleared');
  });
});
