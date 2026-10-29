import { Cardano, Serialization } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';
import { BlockfrostToCardanoSDK } from '@lace-lib/cardano-provider-core';
import { describe, expect, it } from 'vitest';

import type { BlockfrostUtxo } from '@lace-lib/cardano-provider-core';

const ADDRESS =
  'addr_test1wpnlxv2xv9a9ucvnvzqakwepzl9ltx7jzgm53av2e9ncv4sysemm8';
// Plutus Constr 0 [42] and its BLAKE2b-256 hash, as Blockfrost reports both
// for an output that carries the datum inline.
const INLINE_DATUM = 'd8799f182aff';
const DATUM_HASH = Serialization.PlutusData.fromCbor(
  HexBlob(INLINE_DATUM),
).hash();

const blockfrostUtxo = (
  datum: Pick<BlockfrostUtxo, 'data_hash' | 'inline_datum'>,
): BlockfrostUtxo => ({
  address: ADDRESS,
  tx_hash: '39a7a284c2a0948189dc45dec670211cd4d72f7b66c5726c08d9b3df11e44d58',
  tx_index: 0,
  output_index: 0,
  amount: [{ unit: 'lovelace', quantity: '5000000' }],
  block: '7eb8e27d18686c7db9a18f8bbcfe34e3fed6e047afaa2d969904d15e934847e6',
  reference_script_hash: null,
  ...datum,
});

describe('BlockfrostToCardanoSDK.addressUtxoContent', () => {
  it('keeps the inline datum when Blockfrost also reports its hash', () => {
    const [, output] = BlockfrostToCardanoSDK.addressUtxoContent(
      ADDRESS,
      blockfrostUtxo({ inline_datum: INLINE_DATUM, data_hash: DATUM_HASH }),
    );

    expect(output.datumHash).toBeUndefined();
    const serialized = Serialization.TransactionOutput.fromCore(output);
    expect(serialized.datum()?.kind()).toBe(Serialization.DatumKind.InlineData);
    expect(serialized.toCore().datum).toEqual(
      Serialization.PlutusData.fromCbor(HexBlob(INLINE_DATUM)).toCore(),
    );
  });

  it('keeps the datum hash of an output that carries no inline datum', () => {
    const [, output] = BlockfrostToCardanoSDK.addressUtxoContent(
      ADDRESS,
      blockfrostUtxo({ inline_datum: null, data_hash: DATUM_HASH }),
    );

    expect(output.datum).toBeUndefined();
    expect(output.datumHash).toBe(DATUM_HASH);
    expect(Serialization.TransactionOutput.fromCore(output).toCore()).toEqual({
      address: Cardano.PaymentAddress(ADDRESS),
      value: { coins: 5_000_000n },
      datumHash: DATUM_HASH,
    });
  });
});
