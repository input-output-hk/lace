import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';

import { sha256 } from '../src/sha256';

describe('sha256', () => {
  it('matches the FIPS 180-4 vector for "abc"', () => {
    expect(bytesToHex(sha256(utf8ToBytes('abc')))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('matches the digest of the empty message', () => {
    expect(bytesToHex(sha256(new Uint8Array(0)))).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('agrees with the Web Crypto digest over random bytes', async () => {
    const bytes = crypto.getRandomValues(new Uint8Array(77));

    expect(sha256(bytes)).toEqual(
      new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    );
  });
});
