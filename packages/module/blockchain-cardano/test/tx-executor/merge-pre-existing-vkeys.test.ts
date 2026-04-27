import { Serialization } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';
import { HexBytes } from '@lace-sdk/util';
import { describe, expect, it } from 'vitest';

import { mergePreExistingVkeys } from '../../src/tx-executor-implementation/merge-pre-existing-vkeys';

// Mainnet tx CBOR fixture with a valid body — used as the structural base for
// test transactions. Its original witness set is replaced by `withVkeys` below.
const BASE_TX_CBOR = HexBytes(
  '84a60081825820260aed6e7a24044b1254a87a509468a649f522a4e54e830ac10f27ea7b5ec61f01018383581d70b429738bd6cc58b5c7932d001aa2bd05cfea47020a556c8c753d44361a004c4b40582007845f8f3841996e3d8157954e2f5e2fb90465f27112fc5fe9056d916fae245b82583900b1814238b0d287a8a46ce7348c6ad79ab8995b0e6d46010e2d9e1c68042f1946335c498d2e7556c5c647c4649c6a69d2b645cd1428a339ba1a0463676982583900b1814238b0d287a8a46ce7348c6ad79ab8995b0e6d46010e2d9e1c68042f1946335c498d2e7556c5c647c4649c6a69d2b645cd1428a339ba821a00177a6ea2581c648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198a5447742544319271044774554481a0031f9194577444f47451a0056898d4577555344431a000fc589467753484942411a000103c2581c659ab0b5658687c2e74cd10dba8244015b713bf503b90557769d77a7a14a57696e675269646572731a02269552021a0002e665031a01353f84081a013531740b58204107eada931c72a600a6e3305bd22c7aeb9ada7c3f6823b155f4db85de36a69aa20081825820e686ade5bc97372f271fd2abc06cfd96c24b3d9170f9459de1d8e3dd8fd385575840653324a9dddad004f05a8ac99fa2d1811af5f00543591407fb5206cfe9ac91bb1412404323fa517e0e189684cd3592e7f74862e3f16afbc262519abec958180c0481d8799fd8799fd8799fd8799f581cb1814238b0d287a8a46ce7348c6ad79ab8995b0e6d46010e2d9e1c68ffd8799fd8799fd8799f581c042f1946335c498d2e7556c5c647c4649c6a69d2b645cd1428a339baffffffff581cb1814238b0d287a8a46ce7348c6ad79ab8995b0e6d46010e2d9e1c681b000001863784a12ed8799fd8799f4040ffd8799f581c648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff1984577444f4745ffffffd8799fd87980190c8efffff5f6',
);

const PK1 = 'a1'.repeat(32);
const SIG1 = 'b1'.repeat(64);
const PK2 = 'a2'.repeat(32);
const SIG2 = 'b2'.repeat(64);
const SIG1_STALE = 'cc'.repeat(64);

// Replaces the vkey witness set of BASE_TX_CBOR with the given pubkey/signature
// entries and returns the resulting CBOR.
const withVkeys = (vkeys: Array<[string, string]>): HexBytes => {
  const tx = Serialization.Transaction.fromCbor(
    Serialization.TxCBOR(BASE_TX_CBOR),
  );
  const witnessSet = tx.witnessSet();
  witnessSet.setVkeys(
    Serialization.CborSet.fromCore(
      vkeys as Parameters<typeof Serialization.VkeyWitness.fromCore>[0][],
      Serialization.VkeyWitness.fromCore,
    ),
  );
  const rebuilt = new Serialization.Transaction(
    tx.body(),
    witnessSet,
    tx.auxiliaryData(),
  );
  return HexBytes(rebuilt.toCbor());
};

// Rebuilds BASE_TX_CBOR with a witness set that has NO vkeys field at all
// (distinct from an empty vkeys field). CBOR `a0` = empty map.
const withoutVkeysField = (): HexBytes => {
  const tx = Serialization.Transaction.fromCbor(
    Serialization.TxCBOR(BASE_TX_CBOR),
  );
  const emptyWitnessSet = Serialization.TransactionWitnessSet.fromCbor(
    HexBlob('a0'),
  );
  const rebuilt = new Serialization.Transaction(
    tx.body(),
    emptyWitnessSet,
    tx.auxiliaryData(),
  );
  return HexBytes(rebuilt.toCbor());
};

const extractVkeys = (cbor: HexBytes): Map<string, string> => {
  const tx = Serialization.Transaction.fromCbor(Serialization.TxCBOR(cbor));
  const entries = tx.witnessSet().vkeys()?.toCore() ?? [];
  return new Map(entries.map(([pk, sig]) => [String(pk), String(sig)]));
};

describe('mergePreExistingVkeys', () => {
  it('returns the signed tx unchanged when the original has an empty vkeys field', () => {
    const original = withVkeys([]);
    const signed = withVkeys([[PK2, SIG2]]);

    const result = mergePreExistingVkeys(original, signed);

    expect(result).toBe(signed);
  });

  it('returns the signed tx unchanged when the original has no vkeys field at all', () => {
    const original = withoutVkeysField();
    const signed = withVkeys([[PK2, SIG2]]);

    const result = mergePreExistingVkeys(original, signed);

    expect(result).toBe(signed);
  });

  it('preserves the original vkey when the signed tx has no vkeys field', () => {
    const original = withVkeys([[PK1, SIG1]]);
    const signed = withoutVkeysField();

    const result = mergePreExistingVkeys(original, signed);
    const merged = extractVkeys(result);

    expect(merged.size).toBe(1);
    expect(merged.get(PK1)).toBe(SIG1);
  });

  it('merges a pre-existing vkey from the original into the signed tx', () => {
    const original = withVkeys([[PK1, SIG1]]);
    const signed = withVkeys([[PK2, SIG2]]);

    const result = mergePreExistingVkeys(original, signed);
    const merged = extractVkeys(result);

    expect(merged.size).toBe(2);
    expect(merged.get(PK1)).toBe(SIG1);
    expect(merged.get(PK2)).toBe(SIG2);
  });

  it('prefers the fresh signature when the original carries a stale one for the same pubkey', () => {
    const original = withVkeys([[PK1, SIG1_STALE]]);
    const signed = withVkeys([[PK1, SIG1]]);

    const result = mergePreExistingVkeys(original, signed);
    const merged = extractVkeys(result);

    expect(merged.size).toBe(1);
    expect(merged.get(PK1)).toBe(SIG1);
  });
});
