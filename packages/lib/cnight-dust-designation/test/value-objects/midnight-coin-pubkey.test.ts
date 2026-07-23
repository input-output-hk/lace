import { describe, expect, it } from 'vitest';

import {
  MIDNIGHT_COIN_PUBKEY_LENGTH,
  MidnightCoinPubkey,
  MidnightCoinPubkeyError,
} from '../../src/value-objects/midnight-coin-pubkey.vo';

const zeros = (length: number) => new Uint8Array(length);

describe('MidnightCoinPubkey', () => {
  it('accepts exactly 32 bytes', () => {
    const pubkey = MidnightCoinPubkey(zeros(MIDNIGHT_COIN_PUBKEY_LENGTH));
    expect(pubkey.length).toBe(32);
  });

  it('rejects fewer than 32 bytes', () => {
    expect(() => MidnightCoinPubkey(zeros(16))).toThrow(
      MidnightCoinPubkeyError,
    );
  });

  it('rejects more than 32 bytes', () => {
    expect(() => MidnightCoinPubkey(zeros(64))).toThrow(
      MidnightCoinPubkeyError,
    );
  });

  it('roundtrips through hex (lowercase)', () => {
    const bytes = new Uint8Array([
      0xde, 0xad, 0xbe, 0xef, 0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77,
      0x88, 0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, 0x11, 0x22, 0x33, 0x44,
      0x55, 0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb, 0xcc,
    ]);
    const pubkey = MidnightCoinPubkey(bytes);
    const hex = MidnightCoinPubkey.toHex(pubkey);
    expect(hex).toBe(
      'deadbeef00112233445566778899aabbccddeeff112233445566778899aabbcc',
    );
    expect(MidnightCoinPubkey.toHex(MidnightCoinPubkey.fromHex(hex))).toBe(hex);
  });

  it('accepts both 0x-prefixed and bare hex', () => {
    const hex = 'aa'.repeat(32);
    expect(MidnightCoinPubkey.fromHex(hex)).toHaveLength(32);
    expect(MidnightCoinPubkey.fromHex(`0x${hex}`)).toHaveLength(32);
  });

  it('rejects non-hex strings', () => {
    expect(() => MidnightCoinPubkey.fromHex('zz'.repeat(32))).toThrow(
      MidnightCoinPubkeyError,
    );
  });

  it('rejects hex of wrong length', () => {
    expect(() => MidnightCoinPubkey.fromHex('aa'.repeat(16))).toThrow(
      MidnightCoinPubkeyError,
    );
  });
});
