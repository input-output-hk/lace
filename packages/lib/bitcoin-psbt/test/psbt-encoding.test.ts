import { describe, expect, it } from 'vitest';

import { psbtBase64ToHex, psbtHexToBase64 } from '../src/psbt-encoding';

const PSBT_BASE64 = 'cHNidP8BAAoAAAAAAAAAAAAA';
const PSBT_HEX = '70736274ff01000a00000000000000000000';

describe('psbtHexToBase64', () => {
  it('re-encodes a PSBT from hex to base64', () => {
    expect(psbtHexToBase64(PSBT_HEX)).toBe(PSBT_BASE64);
  });
});

describe('psbtBase64ToHex', () => {
  it('re-encodes a PSBT from base64 to hex', () => {
    expect(psbtBase64ToHex(PSBT_BASE64)).toBe(PSBT_HEX);
  });

  it('round-trips back to the original hex', () => {
    expect(psbtBase64ToHex(psbtHexToBase64(PSBT_HEX))).toBe(PSBT_HEX);
  });
});
