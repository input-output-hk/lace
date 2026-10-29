import { Cardano, Serialization, setInConwayEra } from '@cardano-sdk/core';
import {
  Ed25519PrivateKey,
  Hash32ByteBase16,
  ready,
} from '@cardano-sdk/crypto';
import { Base64Blob, HexBlob } from '@cardano-sdk/util';
import { HexBytes } from '@lace-lib/util';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  mergeVkeyWitnesses,
  verifyVkeyWitnesses,
  VkeyWitnessConflictError,
  type CardanoVkeyWitness,
} from '../../src/signing/vkey-witnesses';

import type {
  Ed25519PublicKeyHex,
  Ed25519SignatureHex,
} from '@cardano-sdk/crypto';

const ADDRESS = Cardano.PaymentAddress(
  'addr_test1qpfhhfy2qgls50r9u4yh0l7z67xpg0a5rrhkmvzcuqrd0znuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q9gw0lz',
);

const privateKey = (seed: number) =>
  Ed25519PrivateKey.fromNormalBytes(new Uint8Array(32).fill(seed));

const witnessOf = (
  seed: number,
  txId: Cardano.TransactionId,
): CardanoVkeyWitness => {
  const key = privateKey(seed);
  return {
    vkey: key.toPublic().hex(),
    signature: key.sign(HexBlob(txId)).hex(),
  };
};

const body: Cardano.TxBody = {
  inputs: [{ txId: Cardano.TransactionId('cd'.repeat(32)), index: 0 }],
  outputs: [{ address: ADDRESS, value: { coins: 5_000_000n } }],
  fee: 300_000n,
  scriptIntegrityHash: Hash32ByteBase16('ee'.repeat(32)),
};

/**
 * A finalized transaction in the pre-Conway encoding: a redeemer array,
 * untagged sets, and every witness field Lace does not author. A Core round
 * trip under the Conway encoding rewrites these bytes, so the merge must not
 * take one.
 */
const legacyEncodedTx = (): {
  serializedTx: HexBytes;
  txId: Cardano.TransactionId;
  existing: CardanoVkeyWitness;
} => {
  setInConwayEra(false);
  try {
    const txId = Serialization.TransactionBody.fromCore(body).hash();
    const existing = witnessOf(3, txId);
    const serializedTx = HexBytes(
      Serialization.Transaction.fromCore({
        id: txId,
        body,
        witness: {
          signatures: new Map([[existing.vkey, existing.signature]]),
          bootstrap: [
            {
              key: 'aa'.repeat(32) as Ed25519PublicKeyHex,
              signature: 'bb'.repeat(64) as Ed25519SignatureHex,
              chainCode: HexBlob('cc'.repeat(32)),
              addressAttributes: Base64Blob('oA=='),
            },
          ],
          datums: [42n],
          redeemers: [
            {
              purpose: Cardano.RedeemerPurpose.spend,
              index: 0,
              data: 7n,
              executionUnits: { memory: 1000, steps: 2000 },
            },
          ],
          scripts: [
            {
              __type: Cardano.ScriptType.Plutus,
              version: Cardano.PlutusLanguageVersion.V3,
              bytes: HexBlob('deadbeef'),
            },
          ],
        },
        auxiliaryData: { blob: new Map([[674n, 'memo']]) },
      }).toCbor(),
    );
    return { serializedTx, txId, existing };
  } finally {
    setInConwayEra(true);
  }
};

const parse = (serializedTx: HexBytes) =>
  Serialization.Transaction.fromCbor(Serialization.TxCBOR(serializedTx));

const vkeysOf = (serializedTx: HexBytes): CardanoVkeyWitness[] =>
  (parse(serializedTx).witnessSet().vkeys()?.toCore() ?? []).map(
    ([vkey, signature]) => ({ vkey, signature }),
  );

beforeAll(async () => {
  await ready();
});

describe('verifyVkeyWitnesses', () => {
  const txId = Cardano.TransactionId('01'.repeat(32));

  it('maps each valid witness to the hash of its key', async () => {
    const first = witnessOf(1, txId);
    const second = witnessOf(2, txId);

    const { valid, invalid } = await verifyVkeyWitnesses(txId, [first, second]);

    expect(invalid).toEqual([]);
    expect(valid).toEqual(
      new Map([
        [privateKey(1).toPublic().hash().hex(), first],
        [privateKey(2).toPublic().hash().hex(), second],
      ]),
    );
  });

  it('reports invalid, malformed and misattributed witnesses without throwing', async () => {
    const valid = witnessOf(1, txId);
    const overAnotherBody = witnessOf(
      2,
      Cardano.TransactionId('02'.repeat(32)),
    );
    const tampered = {
      ...valid,
      signature: `${valid.signature.slice(0, -2)}00` as Ed25519SignatureHex,
    };
    const misattributed = {
      vkey: witnessOf(2, txId).vkey,
      signature: valid.signature,
    };
    const malformedKey = {
      vkey: 'ab' as Ed25519PublicKeyHex,
      signature: valid.signature,
    };
    const malformedSignature = {
      vkey: valid.vkey,
      signature: 'ab' as Ed25519SignatureHex,
    };

    const verification = await verifyVkeyWitnesses(txId, [
      valid,
      overAnotherBody,
      tampered,
      misattributed,
      malformedKey,
      malformedSignature,
    ]);

    expect([...verification.valid.values()]).toEqual([valid]);
    expect(verification.invalid).toEqual([
      overAnotherBody,
      tampered,
      misattributed,
      malformedKey,
      malformedSignature,
    ]);
  });
});

describe('mergeVkeyWitnesses', () => {
  it('adds witnesses without re-encoding the body, redeemers, datums, scripts, bootstrap witnesses or auxiliary data', () => {
    const { serializedTx, txId } = legacyEncodedTx();
    const original = parse(serializedTx);
    const originalWitnessSet = original.witnessSet();
    // The fixture has teeth only if a Core round trip would change its bytes.
    expect(
      Serialization.Redeemers.fromCore(
        originalWitnessSet.redeemers()!.toCore(),
      ).toCbor(),
    ).not.toBe(originalWitnessSet.redeemers()!.toCbor());

    const merged = parse(
      mergeVkeyWitnesses(serializedTx, [witnessOf(1, txId)]),
    );
    const mergedWitnessSet = merged.witnessSet();

    expect(merged.getId()).toBe(txId);
    expect(merged.body().toCbor()).toBe(original.body().toCbor());
    expect(merged.isValid()).toBe(original.isValid());
    expect(merged.auxiliaryData()!.toCbor()).toBe(
      original.auxiliaryData()!.toCbor(),
    );
    expect(mergedWitnessSet.redeemers()!.toCbor()).toBe(
      originalWitnessSet.redeemers()!.toCbor(),
    );
    expect(mergedWitnessSet.plutusData()!.toCbor()).toBe(
      originalWitnessSet.plutusData()!.toCbor(),
    );
    expect(mergedWitnessSet.plutusV3Scripts()!.toCbor()).toBe(
      originalWitnessSet.plutusV3Scripts()!.toCbor(),
    );
    expect(mergedWitnessSet.bootstraps()!.toCbor()).toBe(
      originalWitnessSet.bootstraps()!.toCbor(),
    );
  });

  it('adds the first vkey set to a transaction that has none', () => {
    const unsigned = Serialization.Transaction.fromCore({
      id: Cardano.TransactionId('00'.repeat(32)),
      body,
      witness: { signatures: new Map() },
    });
    const txId = unsigned.getId();
    const device = witnessOf(1, txId);

    const merged = mergeVkeyWitnesses(HexBytes(unsigned.toCbor()), [device]);

    expect(vkeysOf(merged)).toEqual([device]);
    expect(parse(merged).body().toCbor()).toBe(unsigned.body().toCbor());
  });

  it('keeps the existing witnesses and sorts the vkey set by key', () => {
    const { serializedTx, txId, existing } = legacyEncodedTx();
    const added = [witnessOf(1, txId), witnessOf(2, txId)];

    const merged = mergeVkeyWitnesses(serializedTx, added);

    expect(vkeysOf(merged)).toEqual(
      [existing, ...added].sort((a, b) => (a.vkey < b.vkey ? -1 : 1)),
    );
  });

  it('gives the same bytes whatever the order or grouping of the merges', () => {
    const { serializedTx, txId } = legacyEncodedTx();
    const device = witnessOf(1, txId);
    const sponsor = witnessOf(2, txId);

    const deviceFirst = mergeVkeyWitnesses(
      mergeVkeyWitnesses(serializedTx, [device]),
      [sponsor],
    );
    const sponsorFirst = mergeVkeyWitnesses(
      mergeVkeyWitnesses(serializedTx, [sponsor]),
      [device],
    );

    expect(sponsorFirst).toBe(deviceFirst);
    expect(mergeVkeyWitnesses(serializedTx, [sponsor, device])).toBe(
      deviceFirst,
    );
  });

  it('leaves the transaction unchanged when every witness is already present', () => {
    const { serializedTx, txId, existing } = legacyEncodedTx();
    const device = witnessOf(1, txId);
    const merged = mergeVkeyWitnesses(serializedTx, [device, device]);

    expect(mergeVkeyWitnesses(merged, [device])).toBe(merged);
    expect(
      mergeVkeyWitnesses(serializedTx, [
        {
          vkey: existing.vkey.toUpperCase() as Ed25519PublicKeyHex,
          signature: existing.signature.toUpperCase() as Ed25519SignatureHex,
        },
      ]),
    ).toBe(serializedTx);
    expect(vkeysOf(merged)).toHaveLength(2);
  });

  it('refuses a second, different signature for a key', () => {
    const { serializedTx, txId, existing } = legacyEncodedTx();
    const otherBody = Cardano.TransactionId('02'.repeat(32));

    expect(() =>
      mergeVkeyWitnesses(serializedTx, [witnessOf(3, otherBody)]),
    ).toThrow(new VkeyWitnessConflictError(existing.vkey));
    expect(() =>
      mergeVkeyWitnesses(serializedTx, [
        witnessOf(1, txId),
        witnessOf(1, otherBody),
      ]),
    ).toThrow(VkeyWitnessConflictError);
  });

  it('produces a transaction whose vkeys all verify over its body hash', async () => {
    const { serializedTx, txId } = legacyEncodedTx();

    const merged = mergeVkeyWitnesses(serializedTx, [
      witnessOf(1, txId),
      witnessOf(2, txId),
    ]);
    const { valid, invalid } = await verifyVkeyWitnesses(
      parse(merged).getId(),
      vkeysOf(merged),
    );

    expect(invalid).toEqual([]);
    expect(valid.size).toBe(3);
  });
});
