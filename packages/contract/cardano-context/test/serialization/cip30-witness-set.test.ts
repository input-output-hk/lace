import { Serialization, setInConwayEra } from '@cardano-sdk/core';
import { Ed25519PublicKeyHex, Ed25519SignatureHex } from '@cardano-sdk/crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  buildCip30SignTxWitnessSet,
  countTransactionSignatures,
} from '../../src/serialization/cip30-witness-set';

import type { HexBlob } from '@cardano-sdk/util';

const SET_TAG = 'd90102';

// pool.pm delegation tx: non-tagged body, empty witness set.
const NON_TAGGED_TX =
  '84a500818258200c6e81157a3a32d1604012646667e7807ac0f39a7a14b9177d96a324a540e8e1000181825839019377877aa7c71dc1556db8a4b6a6a2f2fd0af3154832cc3b79734dd4dede248a756c87149e6ad63c40fb4cf279df35a4c30776d4e939c2ac1a010fffa3021a0002a8dd031a0b4370ed048282008200581cdede248a756c87149e6ad63c40fb4cf279df35a4c30776d4e939c2ac83028200581cdede248a756c87149e6ad63c40fb4cf279df35a4c30776d4e939c2ac581c2d8a81b805c360e9d6de6185b763f0556528d75a4561530e8ce6337ca0f5f6';

const pubKey = (byte: string) => Ed25519PublicKeyHex(byte.repeat(32));
const signature = (byte: string) => Ed25519SignatureHex(byte.repeat(64));

const signWith = (
  unsignedTxCbor: string,
  signatures: Map<Ed25519PublicKeyHex, Ed25519SignatureHex>,
): Serialization.TxCBOR => {
  const tx = Serialization.Transaction.fromCbor(
    Serialization.TxCBOR(unsignedTxCbor),
  );
  const witnessSet = tx.witnessSet();
  witnessSet.setVkeys(
    Serialization.CborSet.fromCore(
      [...signatures.entries()],
      Serialization.VkeyWitness.fromCore,
    ),
  );
  return Serialization.TxCBOR(
    new Serialization.Transaction(
      tx.body(),
      witnessSet,
      tx.auxiliaryData(),
    ).toCbor(),
  );
};

const taggedVariantOf = (unsignedTxCbor: string): string => {
  setInConwayEra(true);
  const tx = Serialization.Transaction.fromCbor(
    Serialization.TxCBOR(unsignedTxCbor),
  );
  const taggedBody = Serialization.TransactionBody.fromCore(tx.body().toCore());
  const tagged = new Serialization.Transaction(
    taggedBody,
    tx.witnessSet(),
    tx.auxiliaryData(),
  ).toCbor();
  setInConwayEra(false);
  return tagged;
};

const decodeSignatures = (
  witnessSetCbor: HexBlob,
): Map<Ed25519PublicKeyHex, Ed25519SignatureHex> =>
  Serialization.TransactionWitnessSet.fromCbor(witnessSetCbor).toCore()
    .signatures;

describe('buildCip30SignTxWitnessSet', () => {
  beforeEach(() => setInConwayEra(false));
  afterEach(() => setInConwayEra(false));

  it('returns plain-array vkeys for a non-tagged dApp tx regardless of inConwayEra', () => {
    const signed = signWith(
      NON_TAGGED_TX,
      new Map([[pubKey('11'), signature('11')]]),
    );

    setInConwayEra(false);
    const fromArrayState = buildCip30SignTxWitnessSet(
      Serialization.TxCBOR(NON_TAGGED_TX),
      signed,
    );
    setInConwayEra(true);
    const fromTaggedState = buildCip30SignTxWitnessSet(
      Serialization.TxCBOR(NON_TAGGED_TX),
      signed,
    );

    expect(fromArrayState).toBe(fromTaggedState);
    expect(fromArrayState).not.toContain(SET_TAG);
    expect(fromArrayState.startsWith('a100')).toBe(true);
  });

  it('returns tagged vkeys for a tagged dApp tx regardless of inConwayEra', () => {
    const taggedTx = taggedVariantOf(NON_TAGGED_TX);
    expect(
      Serialization.Transaction.fromCbor(Serialization.TxCBOR(taggedTx))
        .body()
        .hasTaggedSets(),
    ).toBe(true);

    const signed = signWith(
      taggedTx,
      new Map([[pubKey('11'), signature('11')]]),
    );

    setInConwayEra(false);
    const fromArrayState = buildCip30SignTxWitnessSet(
      Serialization.TxCBOR(taggedTx),
      signed,
    );
    setInConwayEra(true);
    const fromTaggedState = buildCip30SignTxWitnessSet(
      Serialization.TxCBOR(taggedTx),
      signed,
    );

    expect(fromArrayState).toBe(fromTaggedState);
    expect(fromArrayState).toContain(SET_TAG);
  });

  it('returns only the signatures added by this call, preserving their values', () => {
    const existingKey = pubKey('22');
    const paymentKey = pubKey('33');
    const stakeKey = pubKey('44');

    const original = signWith(
      NON_TAGGED_TX,
      new Map([[existingKey, signature('22')]]),
    );
    const signed = signWith(
      NON_TAGGED_TX,
      new Map([
        [existingKey, signature('22')],
        [paymentKey, signature('33')],
        [stakeKey, signature('44')],
      ]),
    );

    const result = decodeSignatures(
      buildCip30SignTxWitnessSet(original, signed),
    );

    expect(result.has(existingKey)).toBe(false);
    expect([...result]).toEqual([
      [paymentKey, signature('33')],
      [stakeKey, signature('44')],
    ]);
  });

  it('overrides a different signature the original has for the same key', () => {
    const key = pubKey('55');
    const original = signWith(NON_TAGGED_TX, new Map([[key, signature('aa')]]));
    const signed = signWith(NON_TAGGED_TX, new Map([[key, signature('bb')]]));

    const result = decodeSignatures(
      buildCip30SignTxWitnessSet(original, signed),
    );

    expect(result.get(key)).toBe(signature('bb'));
  });

  it('returns an empty witness set when no new signatures were added', () => {
    const signatures = new Map([[pubKey('44'), signature('44')]]);
    const original = signWith(NON_TAGGED_TX, signatures);
    const signed = signWith(NON_TAGGED_TX, signatures);

    expect(buildCip30SignTxWitnessSet(original, signed)).toBe('a0');
  });
});

describe('countTransactionSignatures', () => {
  it('counts the vkey signatures in a transaction', () => {
    const signed = signWith(
      NON_TAGGED_TX,
      new Map([
        [pubKey('11'), signature('11')],
        [pubKey('22'), signature('22')],
      ]),
    );

    expect(countTransactionSignatures(signed)).toBe(2);
  });

  it('returns 0 for an unsigned transaction', () => {
    expect(
      countTransactionSignatures(Serialization.TxCBOR(NON_TAGGED_TX)),
    ).toBe(0);
  });
});
