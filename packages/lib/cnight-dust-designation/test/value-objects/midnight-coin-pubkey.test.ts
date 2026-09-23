import { bech32m } from '@scure/base';
import { describe, expect, it } from 'vitest';

import {
  MIDNIGHT_DUST_ADDRESS_MAX_BYTES,
  MidnightCoinPubkey,
  MidnightCoinPubkeyError,
} from '../../src/value-objects/midnight-coin-pubkey.vo';

// A real Midnight dust address (a `mn_dust_undeployed…` stub) — the
// production shape the earlier 32-byte model rejected outright.
const REAL_DUST_ADDRESS =
  'mn_dust_undeployed1wdvvhux7luy22g5w6qsr3qerf49h0curwzfa2fv7acx9x258gmpzz2mtpt2';
const REAL_DUST_PAYLOAD = bech32m.fromWords(
  bech32m.decode(REAL_DUST_ADDRESS as `${string}1${string}`, 1024).words,
);
const REAL_DUST_PAYLOAD_HEX =
  '7358cbf0deff08a5228ed0203883234d4b77e3837093d5259eee0c532a8746c221';

const zeros = (length: number) => new Uint8Array(length);

describe('MidnightCoinPubkey', () => {
  it('accepts a real 33-byte dust-address payload and stores it verbatim', () => {
    expect(REAL_DUST_PAYLOAD.length).toBe(33);
    expect(REAL_DUST_PAYLOAD[0]).toBe(0x73);

    const pubkey = MidnightCoinPubkey(REAL_DUST_PAYLOAD);

    expect(pubkey.length).toBe(33);
    expect(pubkey[0]).toBe(0x73);
    expect(MidnightCoinPubkey.toHex(pubkey)).toBe(REAL_DUST_PAYLOAD_HEX);
  });

  it('accepts a payload of exactly the 33-byte upper bound', () => {
    expect(
      MidnightCoinPubkey(zeros(MIDNIGHT_DUST_ADDRESS_MAX_BYTES)),
    ).toHaveLength(MIDNIGHT_DUST_ADDRESS_MAX_BYTES);
  });

  it('accepts a shorter (32-byte) payload without altering its length', () => {
    expect(MidnightCoinPubkey(zeros(32))).toHaveLength(32);
  });

  it('rejects a payload longer than 33 bytes', () => {
    expect(() => MidnightCoinPubkey(zeros(34))).toThrow(
      MidnightCoinPubkeyError,
    );
  });

  it('encodes a 32-byte payload to lowercase hex', () => {
    const bytes = new Uint8Array([
      0xde, 0xad, 0xbe, 0xef, 0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77,
      0x88, 0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, 0x11, 0x22, 0x33, 0x44,
      0x55, 0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb, 0xcc,
    ]);
    const pubkey = MidnightCoinPubkey(bytes);
    expect(MidnightCoinPubkey.toHex(pubkey)).toBe(
      'deadbeef00112233445566778899aabbccddeeff112233445566778899aabbcc',
    );
  });
});
