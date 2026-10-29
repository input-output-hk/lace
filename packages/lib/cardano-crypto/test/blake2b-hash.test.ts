import { HexBlob } from '@lace-lib/util/common';

import { blake2b } from '../src';

describe('blake2b', () => {
  // Digests of the empty message, from the BLAKE2 reference implementation.
  const EMPTY_BLAKE2B_256 =
    '0e5751c026e543b2e8ab2eb06099daa1d1e5df47778f7787faab45cdf12fe3a8';
  const EMPTY_BLAKE2B_224 =
    '836cc68931c2e4e3e838602eca1902591d216837bafddfe6f0c8cb07';
  // blake2b-256 of "abc" (0x616263).
  const ABC_BLAKE2B_256 =
    'bddd813c634239723171ef3fee98579b94964e3bb1cb3e427262c8c068d52319';

  it('hashes to the requested digest length', () => {
    expect(blake2b.hash(HexBlob(''), 32)).toBe(EMPTY_BLAKE2B_256);
    expect(blake2b.hash(HexBlob(''), 28)).toBe(EMPTY_BLAKE2B_224);
    expect(blake2b.hash(HexBlob('616263'), 32)).toBe(ABC_BLAKE2B_256);
  });

  it('hashAsync resolves to the same digest', async () => {
    await expect(blake2b.hashAsync(HexBlob('616263'), 32)).resolves.toBe(
      ABC_BLAKE2B_256,
    );
  });
});
