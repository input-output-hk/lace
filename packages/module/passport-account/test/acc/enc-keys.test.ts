import { ByteArray, HexBytes } from '@lace-lib/util';
import { describe, expect, it, vi } from 'vitest';

import { generateEncKeyPair } from '../../src/acc/enc-keys';

// RFC 7748 section 6.1 test vector (Alice's keypair).
const RFC7748_SECRET =
  '77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a';
const RFC7748_PUBLIC =
  '8520f0098930a754748b7ddcb43ef75a0dbf3a0d26381af4eba4a98eaa9b4e6a';

describe('generateEncKeyPair', () => {
  it('derives the RFC 7748 public key from an injected 32-byte secret', () => {
    const randomBytes = vi.fn(() =>
      ByteArray.fromHex(HexBytes(RFC7748_SECRET)),
    );

    const pair = generateEncKeyPair({ randomBytes });

    expect(randomBytes).toHaveBeenCalledExactlyOnceWith(32);
    expect(pair.secretKey).toEqual(ByteArray.fromHex(HexBytes(RFC7748_SECRET)));
    expect(HexBytes.fromByteArray(pair.publicKey)).toBe(RFC7748_PUBLIC);
  });

  it('is deterministic for the same injected randomness', () => {
    const randomBytes = () => new Uint8Array(32).fill(9);

    const first = generateEncKeyPair({ randomBytes });
    const second = generateEncKeyPair({ randomBytes });

    expect(first.secretKey).toEqual(second.secretKey);
    expect(first.publicKey).toEqual(second.publicKey);
  });

  it('generates distinct 32-byte keypairs by default', () => {
    const first = generateEncKeyPair();
    const second = generateEncKeyPair();

    expect(first.secretKey).toHaveLength(32);
    expect(first.publicKey).toHaveLength(32);
    expect(first.secretKey).not.toEqual(second.secretKey);
    expect(first.publicKey).not.toEqual(second.publicKey);
  });
});
