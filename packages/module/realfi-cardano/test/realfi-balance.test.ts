import { Cardano, Serialization } from '@cardano-sdk/core';
import { computeMinimumCoinQuantity } from '@cardano-sdk/tx-construction';
import { describe, expect, it } from 'vitest';

import { balanceOrderTx } from '../src/realfi-balance';
import {
  ORDER_ORIGIN_METADATA_LABEL,
  orderOriginMetadatum,
} from '../src/realfi-order-metadata';

// cSpell:disable-next-line
const CHANGE_ADDR =
  'addr_test1qrtdjvvgalpl5pxqftpf5n6mz23ksvg3gwle040z7jarvxquvv2ng0zzk9yx3q627wnledw8gsy9vuljaw0j9vyjs2yqjjnenn';
// Any script address works for the order output in this test.
// cSpell:disable-next-line
const ORDER_ADDR =
  'addr_test1wqg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg0tyy26';

const COINS_PER_UTXO_BYTE = 4310;

const protocolParameters = {
  coinsPerUtxoByte: COINS_PER_UTXO_BYTE,
  maxTxSize: 16_384,
  maxValueSize: 5000,
  minFeeCoefficient: 44,
  minFeeConstant: 155_381,
} as never;

const mkUtxo = (seed: number, coins: bigint): Cardano.Utxo => [
  {
    txId: Cardano.TransactionId(String(seed).repeat(64).slice(0, 64)),
    index: 0,
    address: Cardano.PaymentAddress(CHANGE_ADDR),
  },
  { address: Cardano.PaymentAddress(CHANGE_ADDR), value: { coins } },
];

const orderOutputCbor = Serialization.TransactionOutput.fromCore({
  address: Cardano.PaymentAddress(ORDER_ADDR),
  value: { coins: 2_000_000n },
}).toCbor();

describe('balanceOrderTx', () => {
  it('balances the order output against supplied UTxOs and attaches metadata', async () => {
    const cbor = await balanceOrderTx({
      orderOutputCbor,
      metadata: new Map([
        [ORDER_ORIGIN_METADATA_LABEL, orderOriginMetadatum()],
      ]),
      utxos: [mkUtxo(1, 10_000_000n)].map(u =>
        Serialization.TransactionUnspentOutput.fromCore(u).toCbor(),
      ),
      protocolParameters,
      networkMagic: 2,
      changeAddressBech32: CHANGE_ADDR,
      ttlSeconds: 900,
    });
    const tx = Serialization.Transaction.fromCbor(cbor as never).toCore();
    expect(tx.body.fee).toBeGreaterThan(0n);
    expect(tx.body.validityInterval?.invalidHereafter).toBeDefined();
    // First output is the order output, unchanged.
    expect(tx.body.outputs[0].address).toBe(ORDER_ADDR);
    expect(tx.body.outputs[0].value.coins).toBe(2_000_000n);
    // Change returns to the staker.
    expect(tx.body.outputs.some(output => output.address === CHANGE_ADDR)).toBe(
      true,
    );
    // Metadata label present + aux data hash set.
    expect(tx.auxiliaryData?.blob?.has(ORDER_ORIGIN_METADATA_LABEL)).toBe(true);
    expect(tx.body.auxiliaryDataHash).toBeDefined();
  });

  it('raises an order output below coinsPerUtxoByte min-ADA before adding it', async () => {
    // Deliberately tiny coins — no assets/datum needed to fall below the
    // coinsPerUtxoByte floor for a script address output.
    const tinyOrderOutputCbor = Serialization.TransactionOutput.fromCore({
      address: Cardano.PaymentAddress(ORDER_ADDR),
      value: { coins: 100_000n },
    }).toCbor();
    const cbor = await balanceOrderTx({
      orderOutputCbor: tinyOrderOutputCbor,
      metadata: new Map(),
      utxos: [mkUtxo(2, 10_000_000n)].map(u =>
        Serialization.TransactionUnspentOutput.fromCore(u).toCbor(),
      ),
      protocolParameters,
      networkMagic: 2,
      changeAddressBech32: CHANGE_ADDR,
      ttlSeconds: 900,
    });
    const tx = Serialization.Transaction.fromCbor(cbor as never).toCore();
    const expectedMinCoin = BigInt(
      computeMinimumCoinQuantity(COINS_PER_UTXO_BYTE)({
        address: Cardano.PaymentAddress(ORDER_ADDR),
        value: { coins: 100_000n },
      }),
    );
    expect(tx.body.outputs[0].address).toBe(ORDER_ADDR);
    expect(tx.body.outputs[0].value.coins).toBe(expectedMinCoin);
    expect(tx.body.outputs[0].value.coins).toBeGreaterThan(100_000n);
    // The tx still balances (inputs = outputs + fee) despite the raised output.
    expect(tx.body.fee).toBeGreaterThan(0n);
  });

  it('pays the extra outputs (processing fee) alongside the order, each at or above min-ADA', async () => {
    const feeOutputCbor = Serialization.TransactionOutput.fromCore({
      address: Cardano.PaymentAddress(CHANGE_ADDR),
      value: { coins: 1_000_000n },
    }).toCbor();
    const tinyFeeOutputCbor = Serialization.TransactionOutput.fromCore({
      address: Cardano.PaymentAddress(ORDER_ADDR),
      value: { coins: 100_000n },
    }).toCbor();
    const cbor = await balanceOrderTx({
      orderOutputCbor,
      extraOutputsCbor: [feeOutputCbor, tinyFeeOutputCbor],
      metadata: new Map(),
      utxos: [mkUtxo(3, 10_000_000n)].map(u =>
        Serialization.TransactionUnspentOutput.fromCore(u).toCbor(),
      ),
      protocolParameters,
      networkMagic: 2,
      changeAddressBech32: CHANGE_ADDR,
      ttlSeconds: 900,
    });
    const { outputs } = Serialization.Transaction.fromCbor(
      cbor as never,
    ).toCore().body;
    expect(outputs[0]).toMatchObject({
      address: ORDER_ADDR,
      value: { coins: 2_000_000n },
    });
    expect(outputs[1]).toMatchObject({
      address: CHANGE_ADDR,
      value: { coins: 1_000_000n },
    });
    expect(outputs[2].address).toBe(ORDER_ADDR);
    expect(outputs[2].value.coins).toBe(
      BigInt(
        computeMinimumCoinQuantity(COINS_PER_UTXO_BYTE)({
          address: Cardano.PaymentAddress(ORDER_ADDR),
          value: { coins: 100_000n },
        }),
      ),
    );
  });

  it('rejects when no UTxOs are supplied', async () => {
    await expect(
      balanceOrderTx({
        orderOutputCbor,
        metadata: new Map(),
        utxos: [],
        protocolParameters,
        networkMagic: 2,
        changeAddressBech32: CHANGE_ADDR,
        ttlSeconds: 900,
      }),
    ).rejects.toThrow('No available UTXOs to select from');
  });
});
