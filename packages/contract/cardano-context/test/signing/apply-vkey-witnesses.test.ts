import { Serialization } from '@cardano-sdk/core';
import { describe, expect, it } from 'vitest';

import { applyVkeyWitnesses } from '../../src/signing/apply-vkey-witnesses';

import type { Ed25519PublicKeyHex } from '@cardano-sdk/crypto';

// Well-formed hex of the right lengths: a vkey is 32 bytes, a signature 64.
const vkey = (fill: string) => fill.repeat(64) as Ed25519PublicKeyHex;
const sig = (fill: string) => fill.repeat(128);

/**
 * Six signers ride this helper and five of their suites mock it, so the real
 * CBOR construction is otherwise pinned only through the in-memory signer's
 * regression test. This asserts the construction directly: what goes in as
 * [publicKey, signature] pairs must come back out of the witness set intact,
 * in order, through a real Serialization round trip.
 */
describe('applyVkeyWitnesses', () => {
  it('round-trips the pairs through a real witness set, preserving order', () => {
    const witnessSet = new Serialization.TransactionWitnessSet();
    const pairs: [Ed25519PublicKeyHex, string][] = [
      [vkey('aa'), sig('11')],
      [vkey('bb'), sig('22')],
    ];

    applyVkeyWitnesses(witnessSet, pairs);

    const roundTripped = [...(witnessSet.vkeys()?.toCore() ?? [])];
    expect(roundTripped).toEqual(pairs);
  });

  it('accepts a one-shot iterable, the shape the merged-witness callers pass', () => {
    const witnessSet = new Serialization.TransactionWitnessSet();
    const merged = new Map<Ed25519PublicKeyHex, string>([
      [vkey('cc'), sig('33')],
    ]);

    // vault-keystone passes merged.values()-style iterables; the helper must
    // consume them once rather than assume a re-iterable collection.
    applyVkeyWitnesses(witnessSet, merged.entries());

    expect([...(witnessSet.vkeys()?.toCore() ?? [])]).toEqual([
      [vkey('cc'), sig('33')],
    ]);
  });

  it('replaces any witnesses already set rather than appending', () => {
    const witnessSet = new Serialization.TransactionWitnessSet();
    applyVkeyWitnesses(witnessSet, [[vkey('aa'), sig('11')]]);
    applyVkeyWitnesses(witnessSet, [[vkey('bb'), sig('22')]]);

    // setVkeys semantics: the second application wins outright. The merging
    // callers (sign-sweep-tx, keystone) merge BEFORE calling for this reason.
    expect([...(witnessSet.vkeys()?.toCore() ?? [])]).toEqual([
      [vkey('bb'), sig('22')],
    ]);
  });
});
