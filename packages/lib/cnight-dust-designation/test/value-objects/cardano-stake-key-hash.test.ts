import { describe, expect, it } from 'vitest';

import {
  CARDANO_KEY_HASH_LENGTH,
  CardanoStakeKeyHash,
  CardanoStakeKeyHashError,
} from '../../src/value-objects/cardano-stake-key-hash.vo';

const zeros = (length: number) => new Uint8Array(length);

describe('CardanoStakeKeyHash', () => {
  it('accepts exactly 28 bytes', () => {
    expect(CardanoStakeKeyHash(zeros(CARDANO_KEY_HASH_LENGTH))).toHaveLength(
      28,
    );
  });

  it('rejects fewer than 28 bytes', () => {
    expect(() => CardanoStakeKeyHash(zeros(20))).toThrow(
      CardanoStakeKeyHashError,
    );
  });

  it('rejects more than 28 bytes', () => {
    expect(() => CardanoStakeKeyHash(zeros(32))).toThrow(
      CardanoStakeKeyHashError,
    );
  });

  it('roundtrips through hex', () => {
    const hex = 'ab'.repeat(28);
    expect(CardanoStakeKeyHash.toHex(CardanoStakeKeyHash.fromHex(hex))).toBe(
      hex,
    );
  });

  it('rejects hex of wrong length', () => {
    expect(() => CardanoStakeKeyHash.fromHex('ab'.repeat(16))).toThrow(
      CardanoStakeKeyHashError,
    );
  });

  it('rejects non-hex strings', () => {
    expect(() => CardanoStakeKeyHash.fromHex('zz'.repeat(28))).toThrow(
      CardanoStakeKeyHashError,
    );
  });
});
