import { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import { InvalidStringError } from '@cardano-sdk/util';
import { describe, it, expect } from 'vitest';

import { Cip1852ExtendedAccountPublicKey } from '../../../src';

describe('Cip1852ExtendedAccountPublicKey', () => {
  const validBech32Key =
    'acct_xvk1v2ep0q3ml3qxjswexftyyd8p0sjc4436axpll2ag8v5qakaw3kungz9ncw8shhdzh0ejydl93kgvwavanf7tupj3zsjcmljun6s49jc2vnqx7';
  const validHex = Bip32PublicKeyHex(
    '62b217823bfc406941d932564234e17c258ad63ae983ffaba83b280edbae8db93408b3c38f0bdda2bbf32237e58d90c7759d9a7cbe065114258dfe5c9ea152cb',
  );
  const invalidKey = 'invalid_key_format';
  const keyWithWrongPrefix =
    'wrong_prefix1wpqgzz3gm4vj0y4j7xrhpqxk4yqlujgxr2jp5r0q9sng0n7r4g0c4s0wyr8r6vy4xp0gx7uv8y4q2g7tzmgk3ync4v4pj4k8qpg5w3q5yxqm4p6';

  describe('constructor', () => {
    it('should create a valid Cip1852ExtendedAccountPublicKey from valid bech32 string', () => {
      const result = Cip1852ExtendedAccountPublicKey(validBech32Key);
      expect(result).toBe(validBech32Key);
      expect(typeof result).toBe('string');
    });

    it('should throw InvalidStringError for invalid string format', () => {
      expect(() => Cip1852ExtendedAccountPublicKey(invalidKey)).toThrow(
        InvalidStringError,
      );
      expect(() => Cip1852ExtendedAccountPublicKey(invalidKey)).toThrow(
        'Expected key to be a bech32 encoded string',
      );
    });

    it('should throw InvalidStringError for wrong prefix', () => {
      expect(() => Cip1852ExtendedAccountPublicKey(keyWithWrongPrefix)).toThrow(
        InvalidStringError,
      );
      expect(() => Cip1852ExtendedAccountPublicKey(keyWithWrongPrefix)).toThrow(
        'Expected key to be a bech32 encoded string',
      );
    });
  });

  describe('fromBip32PublicKeyHex', () => {
    it('should create a valid Cip1852ExtendedAccountPublicKey from valid hex string', () => {
      const result =
        Cip1852ExtendedAccountPublicKey.fromBip32PublicKeyHex(validHex);
      expect(result).toBe(validBech32Key);
    });
  });

  describe('toBip32PublicKeyHex', () => {
    it('should convert a valid Cip1852ExtendedAccountPublicKey to Bip32PublicKeyHex', () => {
      const result = Cip1852ExtendedAccountPublicKey.toBip32PublicKeyHex(
        Cip1852ExtendedAccountPublicKey(validBech32Key),
      );
      expect(result).toBe(validHex);
    });
  });
});
