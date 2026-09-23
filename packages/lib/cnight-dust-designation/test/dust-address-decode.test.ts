import { bech32m } from '@scure/base';
import { describe, expect, it } from 'vitest';

import { dustAddressToCoinPubkeyHex } from '../src/dust-address-decode';
import { MidnightCoinPubkeyError } from '../src/value-objects/midnight-coin-pubkey.vo';
import { CardanoDustNetwork } from '../src/value-objects/network-id.vo';

// Real Midnight dust address, copied from `@lace-contract/midnight-context`'s
// stub-data (a wallet-SDK-generated `mn_dust_undeployed…` address). Its bech32m
// payload is 33 bytes — a 1-byte SCALE prefix (0x73) + 32 LE scalar bytes — kept
// verbatim by the decoder.
const REAL_TESTNET_DUST_ADDRESS =
  'mn_dust_undeployed1wdvvhux7luy22g5w6qsr3qerf49h0curwzfa2fv7acx9x258gmpzz2mtpt2';
// Same real 33-byte payload re-encoded under the mainnet HRP, to exercise the
// mn_dust → mainnet derivation with production-shaped bytes.
const REAL_MAINNET_DUST_ADDRESS =
  'mn_dust1wdvvhux7luy22g5w6qsr3qerf49h0curwzfa2fv7acx9x258gmpzzgdspqv';
const REAL_DUST_PAYLOAD_HEX =
  '7358cbf0deff08a5228ed0203883234d4b77e3837093d5259eee0c532a8746c221';
// Real shielded address from the same stub-data — a non-dust HRP, must be rejected.
const REAL_SHIELDED_ADDRESS =
  'mn_shield-addr_undeployed1tffkxdesnqz86wvds2aprwuprpvzvag5t3mkveddr33hr7xyhlhyjqqvfftm8asg986dx9puzwkmedeune9nfkuqvtmccmxtjwvlrvcrh5gv3';

// A dust address carrying `payloadHex` as its bech32m payload, so a test can
// name the exact bytes the decoder sees.
const dustAddressWithPayload = (payloadHex: string): string =>
  bech32m.encode(
    'mn_dust',
    bech32m.toWords(
      Uint8Array.from(payloadHex.match(/../g) ?? [], byte =>
        parseInt(byte, 16),
      ),
    ),
    1024,
  );

// BLS12-381 scalar field order (`r`): the bound the Midnight SDK's
// `DustAddress` constructor enforces. The little-endian forms are derived from
// this one constant so the r / r-1 boundary pair cannot drift apart by a
// transcription slip — together they pin the decoder's own constant exactly.
const BLS12_381_R = BigInt(
  '0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001',
);
const scalarToLE32Hex = (value: bigint): string => {
  const bytes: string[] = [];
  for (let index = 0; index < 32; index++) {
    bytes.push(
      ((value >> BigInt(index * 8)) & 0xffn).toString(16).padStart(2, '0'),
    );
  }
  return bytes.join('');
};
const R_LE = scalarToLE32Hex(BLS12_381_R);
const R_MINUS_ONE_LE = scalarToLE32Hex(BLS12_381_R - 1n);

describe('dustAddressToCoinPubkeyHex', () => {
  it('decodes a real dust address to its verbatim 33-byte payload', () => {
    expect(dustAddressToCoinPubkeyHex(REAL_TESTNET_DUST_ADDRESS)).toEqual({
      coinPubkeyHex: REAL_DUST_PAYLOAD_HEX,
      kind: 'dust',
      network: CardanoDustNetwork.testnet,
    });
  });

  it('derives mainnet from the mn_dust HRP', () => {
    expect(dustAddressToCoinPubkeyHex(REAL_MAINNET_DUST_ADDRESS)).toEqual({
      coinPubkeyHex: REAL_DUST_PAYLOAD_HEX,
      kind: 'dust',
      network: CardanoDustNetwork.mainnet,
    });
  });

  it('rejects a non-dust HRP (shielded address)', () => {
    expect(() => dustAddressToCoinPubkeyHex(REAL_SHIELDED_ADDRESS)).toThrow(
      MidnightCoinPubkeyError,
    );
  });

  it('rejects a non-bech32m string', () => {
    expect(() => dustAddressToCoinPubkeyHex('not-an-address')).toThrow(
      MidnightCoinPubkeyError,
    );
  });

  // A single-reason over-length vector is impossible: any payload past 33
  // bytes is already non-minimal or out of field, so the canonical check
  // always fires first and the VO's <= 33 bound stays an unreachable mirror.
  it('rejects an oversized (34-byte) payload as non-canonical', () => {
    const oversizedPayload = bech32m.encode(
      'mn_dust',
      bech32m.toWords(new Uint8Array(34)),
      1024,
    );
    expect(() => dustAddressToCoinPubkeyHex(oversizedPayload)).toThrow(
      MidnightCoinPubkeyError,
    );
  });

  describe('canonical SCALE-compact payloads', () => {
    const accepts = (label: string, payloadHex: string): void => {
      it(`accepts ${label}`, () => {
        expect(
          dustAddressToCoinPubkeyHex(dustAddressWithPayload(payloadHex))
            .coinPubkeyHex,
        ).toBe(payloadHex);
      });
    };

    accepts(
      'the largest in-field scalar as a 33-byte 0x73 payload',
      `73${R_MINUS_ONE_LE}`,
    );

    accepts('a 32-byte 0x6f payload (31-byte scalar)', `6f${'ff'.repeat(31)}`);

    // The rule is the codec's, not a length floor: a scalar small enough for the
    // single-byte mode encodes to one byte and must still decode.
    accepts('a tiny scalar in the single-byte mode', '04');

    accepts('the smallest two-byte-mode value (64)', '0101');

    accepts('the smallest four-byte-mode value (2^14)', '02000100');
  });

  describe('non-canonical SCALE-compact payloads', () => {
    // Reports 'accepted' rather than throwing, so a payload that slips through
    // fails on the code assertion instead of on an absent error.
    const outcomeOf = (payloadHex: string): string => {
      try {
        dustAddressToCoinPubkeyHex(dustAddressWithPayload(payloadHex));
      } catch (error) {
        if (error instanceof MidnightCoinPubkeyError) return error.code;
        throw error;
      }
      return 'accepted';
    };

    const rejects = (label: string, payloadHex: string): void => {
      it(`rejects ${label}`, () => {
        expect(outcomeOf(payloadHex)).toBe('invalid-dust-payload');
      });
    };

    rejects('an empty payload', '');

    rejects(
      'a small scalar padded into the 33-byte 0x73 form',
      `7301${'00'.repeat(31)}`,
    );

    rejects(
      'a 0x73 header with fewer than 32 scalar bytes',
      `73${'ff'.repeat(20)}`,
    );

    rejects('the field order itself', `73${R_LE}`);

    rejects('the field order padded to 33 scalar bytes', `77${R_LE}00`);

    rejects(
      'a trailing byte after a complete compact integer',
      `6f${'ff'.repeat(31)}00`,
    );

    // Isolates the top-byte-nonzero rule: length consistent, value >= 2^30 and
    // in field, so ONLY the zero most-significant byte can reject this one.
    rejects(
      'a 31-byte scalar zero-padded into the 33-byte 0x73 form',
      `73${'ff'.repeat(31)}00`,
    );

    rejects('a two-byte mode whose payload is three bytes', '010203');

    rejects('a four-byte mode whose payload is five bytes', '0200000000');

    rejects('a two-byte encoding of a value below 64', '0100');

    rejects('a four-byte encoding of a value below 2^14', '02000000');

    rejects('a big-integer encoding of a value below 2^30', '0300000001');
  });
});
