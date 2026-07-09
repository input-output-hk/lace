import { Cardano } from '@cardano-sdk/core';
import { Hash28ByteBase16 } from '@cardano-sdk/crypto';
import { describe, expect, it } from 'vitest';

import { drepIDasBech32FromHash } from '../../src/utils/drepId-from-bech32-hash';

describe('drepIDasBech32FromHash', () => {
  it('encodes a 28-byte hash as a bech32 string with the "drep" HRP', () => {
    const hash = Hash28ByteBase16(
      '1c46955f71c49a6c987104145d5a18154883f51c846c12a6a02dcd60',
    );

    const result = drepIDasBech32FromHash(hash);

    expect(result.startsWith('drep1')).toBe(true);
  });

  it('returns the same bech32 string the SDK would produce from the equivalent credential', () => {
    const hash = Hash28ByteBase16(
      'aa46955f71c49a6c987104145d5a18154883f51c846c12a6a02dcd60',
    );
    const expected = Cardano.DRepID.cip105FromCredential({
      hash,
      type: Cardano.CredentialType.KeyHash,
    });

    expect(drepIDasBech32FromHash(hash)).toBe(expected);
  });

  it('returns a deterministic value for a given hash', () => {
    const hash = Hash28ByteBase16(
      'cccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    );

    expect(drepIDasBech32FromHash(hash)).toBe(drepIDasBech32FromHash(hash));
  });

  it('produces different bech32 strings for different hashes', () => {
    // 28-byte (56 hex char) base16 fixtures.
    const a = Hash28ByteBase16(
      '11111111111111111111111111111111111111111111111111111111',
    );
    const b = Hash28ByteBase16(
      '22222222222222222222222222222222222222222222222222222222',
    );

    expect(drepIDasBech32FromHash(a)).not.toBe(drepIDasBech32FromHash(b));
  });
});
