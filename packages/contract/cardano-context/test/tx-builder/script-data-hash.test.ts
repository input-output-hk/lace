import { Cardano, Serialization, setInConwayEra } from '@cardano-sdk/core';
import { blake2b } from '@cardano-sdk/crypto';
import { computeScriptDataHash } from '@cardano-sdk/tx-construction';
import { HexBlob } from '@cardano-sdk/util';
import { beforeEach, describe, expect, it } from 'vitest';

import { computeConwayScriptDataHash } from '../../src/tx-builder/script-data-hash';

const V3 = Cardano.PlutusLanguageVersion.V3;

// A trimmed V3 cost model — the exact values are irrelevant to what this suite
// asserts (the preimage encoding), only that the language view is deterministic.
const costModels: Cardano.CostModels = new Map([
  [V3, [100_788, 420, 1, 1, 1000, 173, 0, 1]],
]);

// One mint redeemer, as in the cNIGHT register flow.
const redeemers: Cardano.Redeemer[] = [
  {
    index: 0,
    purpose: Cardano.RedeemerPurpose.mint,
    data: 42n,
    executionUnits: { memory: 1000, steps: 2000 },
  },
];

const datums: Cardano.PlutusData[] = [42n, 7n];

// hashScriptIntegrity preimage segments, hand-encoded from the Conway CDDL so
// the expected hashes are derived from the spec rather than from the
// implementation under test.
//
// redeemers, Conway map form { [tag, index] => [data, ex_units] }:
//   a1 820100 82 182a 82 1903e8 1907d0   = { [1 (mint), 0] => [42, [1000, 2000]] }
const REDEEMERS_MAP = 'a182010082182a821903e81907d0';
// datums, nonempty_set<plutus_data> (tag 258):
//   d9 0102 82 182a 07                   = 258([42, 7])
const DATUMS_SET = 'd9010282182a07';
// language views:
//   a1 02 88 1a000189b4 1901a4 01 01 1903e8 18ad 00 01
//                                        = { 2 (PlutusV3) => cost model above }
const LANGUAGE_VIEWS = 'a102881a000189b41901a401011903e818ad0001';
const EMPTY_MAP = 'a0';

const hashPreimage = (...segments: string[]) =>
  blake2b.hash(HexBlob(segments.join('')), 32);

describe('computeConwayScriptDataHash', () => {
  beforeEach(() => {
    // The builder sets this in its ctor; Serialization.Redeemers and CborSet
    // only emit the Conway forms when it is set.
    setInConwayEra(true);
  });

  it('returns undefined when there are neither redeemers nor datums', () => {
    expect(
      computeConwayScriptDataHash({
        costModels,
        usedLanguages: [V3],
        redeemers: [],
        datums: undefined,
      }),
    ).toBeUndefined();
  });

  it('hashes over the Conway map redeemer encoding', () => {
    const hash = computeConwayScriptDataHash({
      costModels,
      usedLanguages: [V3],
      redeemers,
      datums: undefined,
    });
    expect(hash).toBe(hashPreimage(REDEEMERS_MAP, LANGUAGE_VIEWS));
    // The pinned literal guards hashPreimage itself — blake2b must hash the
    // decoded bytes, not the hex text. Reproduced independently with Python
    // hashlib.blake2b(digest_size=32) over the same preimage.
    expect(hash).toBe(
      '0be4a0a677e0c97fc4ab69f900312ff7746fde849f2009a7a96c1846daa515d7',
    );
  });

  it('appends datums to the preimage as the tag-258 nonempty_set the witness set emits', () => {
    expect(
      computeConwayScriptDataHash({
        costModels,
        usedLanguages: [V3],
        redeemers,
        datums,
      }),
    ).toBe(hashPreimage(REDEEMERS_MAP, DATUMS_SET, LANGUAGE_VIEWS));
  });

  it('brackets a datums-only preimage with empty redeemer and language-view maps', () => {
    expect(
      computeConwayScriptDataHash({
        costModels,
        usedLanguages: [],
        redeemers: [],
        datums,
      }),
    ).toBe(hashPreimage(EMPTY_MAP, DATUMS_SET, EMPTY_MAP));
  });

  it('pins DATUMS_SET to the witness-set wire bytes the node re-hashes', () => {
    expect(
      Serialization.TransactionWitnessSet.fromCore({
        signatures: new Map(),
        datums,
      }).toCbor(),
    ).toBe(`a104${DATUMS_SET}`);
  });

  it('throws naming the language whose cost model is absent from the protocol parameters', () => {
    expect(() =>
      computeConwayScriptDataHash({
        costModels: new Map([[Cardano.PlutusLanguageVersion.V1, [1, 2]]]),
        usedLanguages: [Cardano.PlutusLanguageVersion.V1, V3],
        redeemers,
        datums: undefined,
      }),
    ).toThrow('Missing cost model for PlutusV3 in the protocol parameters');
  });

  it('does NOT match tx-construction computeScriptDataHash, which emits the Alonzo redeemer array', () => {
    // The SDK helper ignores the Conway era for redeemers and encodes them as an
    // Alonzo array, so the node recomputes a different hash from the map-encoded
    // witness redeemers and rejects the tx (PPViewHashesDontMatch). Matching it
    // would reintroduce that bug.
    const conway = computeConwayScriptDataHash({
      costModels,
      usedLanguages: [V3],
      redeemers,
      datums: undefined,
    });
    const sdk = computeScriptDataHash(costModels, [V3], redeemers, undefined);
    expect(conway).not.toBe(sdk);
  });
});
