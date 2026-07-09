import { Serialization } from '@cardano-sdk/core';
import { Ed25519PublicKeyHex, Ed25519SignatureHex } from '@cardano-sdk/crypto';
import { describe, expect, it } from 'vitest';

import { encodeCborSet } from '../../src/serialization/cbor-set-encoding';

const SET_TAG = 'd90102';

const element = Serialization.VkeyWitness.fromCore([
  Ed25519PublicKeyHex('00'.repeat(32)),
  Ed25519SignatureHex('00'.repeat(64)),
]).toCbor();

describe('encodeCborSet', () => {
  it('encodes a plain array set when tagged is false', () => {
    const result = encodeCborSet([element], false);
    expect(result.startsWith('81')).toBe(true);
    expect(result).not.toContain(SET_TAG);
  });

  it('encodes a tag-258 set when tagged is true', () => {
    const result = encodeCborSet([element], true);
    expect(result.startsWith(SET_TAG)).toBe(true);
  });

  it('encodes an empty plain array set', () => {
    expect(encodeCborSet([], false)).toBe('80');
  });

  it('encodes an empty tag-258 set', () => {
    expect(encodeCborSet([], true)).toBe(`${SET_TAG}80`);
  });
});
