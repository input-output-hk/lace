// Known-answer coverage for the Midnight `signData` domain-separation prefix
// (src/sign-message-prefix.ts, LW-15403). The exact bytes are the security
// boundary: they must equal `midnight_signed_message:<size>:` (UTF-8) followed
// by the verbatim payload, where <size> is the payload's BYTE length. A drift
// here reintroduces the transaction-witness forgery, so these vectors are
// pinned to the spec text, built independently of the helper's own
// header+append construction.

import { describe, expect, it } from 'vitest';

import { applyMidnightSignedMessagePrefix } from '../src/sign-message-prefix';

const concat = (...parts: Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
};

const utf8 = (s: string): Uint8Array => new TextEncoder().encode(s);

const fromHex = (hex: string): Uint8Array =>
  new Uint8Array(Buffer.from(hex, 'hex'));

describe('applyMidnightSignedMessagePrefix', () => {
  it('prefixes an ASCII payload with the byte-length header', () => {
    expect(applyMidnightSignedMessagePrefix(utf8('Hello'))).toEqual(
      utf8('midnight_signed_message:5:Hello'),
    );
  });

  it('uses the payload BYTE length and appends the payload verbatim', () => {
    // 😀 is four UTF-8 bytes: size is 4 (bytes), not 1 (code point).
    const payload = new Uint8Array([0xf0, 0x9f, 0x98, 0x80]);
    expect(applyMidnightSignedMessagePrefix(payload)).toEqual(
      concat(utf8('midnight_signed_message:4:'), payload),
    );
  });

  it('prefixes a transaction-shaped payload with a multi-digit size', () => {
    // The LW-15403 repro shape — the hex blob the audit dapp passed to
    // signData. Its 32 bytes make this the only vector whose <size> needs two
    // decimal digits.
    const txData = fromHex(
      '0f1e2d3c4b5a69788796a5b4c3d2e1f00f1e2d3c4b5a69788796a5b4c3d2e1f0',
    );
    expect(applyMidnightSignedMessagePrefix(txData)).toEqual(
      concat(utf8('midnight_signed_message:32:'), txData),
    );
  });

  it('prefixes a payload that is itself an already-prefixed message', () => {
    // Unconditional by design: an `already prefixed?` short-circuit would let a
    // dapp submit `midnight_signed_message:5:Hello` and receive a signature
    // over exactly those bytes — a valid signature for the message `Hello`.
    expect(
      applyMidnightSignedMessagePrefix(utf8('midnight_signed_message:5:Hello')),
    ).toEqual(
      utf8('midnight_signed_message:31:midnight_signed_message:5:Hello'),
    );
  });

  it('still carries the header with size 0 for an empty payload', () => {
    expect(applyMidnightSignedMessagePrefix(new Uint8Array())).toEqual(
      utf8('midnight_signed_message:0:'),
    );
  });
});
