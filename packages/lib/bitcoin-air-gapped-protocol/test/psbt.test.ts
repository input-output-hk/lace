import { Buffer } from 'buffer';

import { describe, expect, it } from 'vitest';

import {
  BitcoinUrType,
  decodeCryptoPsbt,
  encodeCryptoPsbt,
  encodeSignRequest,
  parseSignResponse,
} from '../src';

import { CborWriter } from './fixtures/cbor-writer';

const PSBT_BYTES = Uint8Array.from(Buffer.from('70736274ff0100', 'hex'));

describe('crypto-psbt encode and parse', () => {
  it('round-trips PSBT bytes through encode then decode', () => {
    const cbor = encodeCryptoPsbt(PSBT_BYTES);
    expect(Array.from(decodeCryptoPsbt(cbor))).toEqual(Array.from(PSBT_BYTES));
  });

  it('encodes a bare CBOR byte string with no top-level tag (ur:crypto-psbt shape)', () => {
    const cbor = encodeCryptoPsbt(PSBT_BYTES);
    expect(cbor[0] >> 5).toBe(2);
  });

  it('decodes a bare (untagged) byte string as a real device emits', () => {
    const bare = new CborWriter().writeBytes(PSBT_BYTES).toBytes();
    expect(Array.from(decodeCryptoPsbt(bare))).toEqual(Array.from(PSBT_BYTES));
  });

  it('still tolerates a legacy tag-wrapped byte string', () => {
    const tagged = new CborWriter()
      .writeTag(40_310)
      .writeBytes(PSBT_BYTES)
      .toBytes();
    expect(Array.from(decodeCryptoPsbt(tagged))).toEqual(
      Array.from(PSBT_BYTES),
    );
  });

  it('encodeSignRequest yields a crypto-psbt UR type', () => {
    const request = encodeSignRequest(PSBT_BYTES);
    expect(request.urType).toBe(BitcoinUrType.Psbt);
    expect(Array.from(parseSignResponse(request.cbor))).toEqual(
      Array.from(PSBT_BYTES),
    );
  });

  it('parseSignResponse preserves bytes for a signed response', () => {
    const signed = Uint8Array.from(Buffer.from('70736274ff01009901', 'hex'));
    expect(Array.from(parseSignResponse(encodeCryptoPsbt(signed)))).toEqual(
      Array.from(signed),
    );
  });

  it('parseSignResponse throws on a non-psbt UR body', () => {
    const notPsbt = new CborWriter()
      .writeTag(40_303)
      .writeBytes(PSBT_BYTES)
      .toBytes();
    expect(() => parseSignResponse(notPsbt)).toThrow();
  });

  it('decodeCryptoPsbt throws when the tag content is not a byte string', () => {
    const badContent = new CborWriter().writeTag(40_310).writeUint(1).toBytes();
    expect(() => decodeCryptoPsbt(badContent)).toThrow();
  });
});
