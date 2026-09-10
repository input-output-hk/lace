import { Cardano, Serialization } from '@cardano-sdk/core';
import { describe, expect, it } from 'vitest';

import { createChainedTxOutputCache } from '../src/common/store/chained-tx-output-cache';

const OWN_ADDRESS = Cardano.PaymentAddress(
  'addr_test1qpw0djgj0x59ngrjvqthn7enhvruxnsavsw5th63la3mjel3tkc974sr23jmlzgq5zda4gtv8k9cy38756r9y3qgmkqqjz6aa7',
);
const OTHER_ADDRESS = Cardano.PaymentAddress(
  'addr_test1qqt3r9kd56aq9ajynjkz8hdfw3kc0pcv3tpzug8azxls62tvvz7nw9gmznn65g4ksrrfvyzhz52knc3mqxdyya47gz2qmcjmcq',
);
const OWN_ADDRESSES: ReadonlySet<string> = new Set([OWN_ADDRESS]);

const buildTxCbor = ({
  inputs,
  collaterals,
  outputs,
  fee = 170_000n,
}: {
  inputs: Cardano.TxIn[];
  collaterals?: Cardano.TxIn[];
  outputs: { address: Cardano.PaymentAddress; coins: bigint }[];
  fee?: bigint;
}): string =>
  Serialization.Transaction.fromCore({
    id: Cardano.TransactionId('0'.repeat(64)),
    body: {
      inputs,
      ...(collaterals ? { collaterals } : {}),
      outputs: outputs.map(({ address, coins }) => ({
        address,
        value: { coins },
      })),
      fee,
    },
    witness: { signatures: new Map() },
  }).toCbor();

const txIdOf = (cbor: string): Cardano.TransactionId =>
  Serialization.Transaction.fromCbor(Serialization.TxCBOR(cbor)).getId();

const dummyInput = (seed: number): Cardano.TxIn => ({
  txId: Cardano.TransactionId(
    seed.toString(16).padStart(2, '0').repeat(32).slice(0, 64),
  ),
  index: 0,
});

const spendingTxCbor = (source: Cardano.TransactionId, index: number): string =>
  buildTxCbor({
    inputs: [{ txId: source, index }],
    outputs: [{ address: OWN_ADDRESS, coins: 1_000_000n }],
  });

describe('chainedTxOutputCache', () => {
  it('resolves an input spending a recorded own-address output to a synthetic utxo', () => {
    const cache = createChainedTxOutputCache();
    const tx1 = buildTxCbor({
      inputs: [dummyInput(1)],
      outputs: [
        { address: OWN_ADDRESS, coins: 5_000_000n },
        { address: OTHER_ADDRESS, coins: 2_000_000n },
      ],
    });
    cache.recordOwnTransaction(tx1);

    const resolved = cache.resolveChainedInputs(
      spendingTxCbor(txIdOf(tx1), 0),
      OWN_ADDRESSES,
    );

    expect(resolved).toHaveLength(1);
    const [txIn, txOut] = resolved[0];
    expect(txIn).toEqual({
      txId: txIdOf(tx1),
      index: 0,
      address: OWN_ADDRESS,
    });
    expect(txOut.address).toBe(OWN_ADDRESS);
    expect(txOut.value.coins).toBe(5_000_000n);
  });

  it('resolves a collateral referencing a recorded own-address output', () => {
    const cache = createChainedTxOutputCache();
    const tx1 = buildTxCbor({
      inputs: [dummyInput(1)],
      outputs: [{ address: OWN_ADDRESS, coins: 5_000_000n }],
    });
    cache.recordOwnTransaction(tx1);

    const spendingTx = buildTxCbor({
      inputs: [dummyInput(50)],
      collaterals: [{ txId: txIdOf(tx1), index: 0 }],
      outputs: [{ address: OWN_ADDRESS, coins: 1_000_000n }],
    });
    const resolved = cache.resolveChainedInputs(spendingTx, OWN_ADDRESSES);

    expect(resolved).toHaveLength(1);
    expect(resolved[0][0]).toEqual({
      txId: txIdOf(tx1),
      index: 0,
      address: OWN_ADDRESS,
    });
  });

  it('never resolves outputs paying to foreign addresses, so utxo-set membership keeps implying ownership', () => {
    const cache = createChainedTxOutputCache();
    const tx1 = buildTxCbor({
      inputs: [dummyInput(1)],
      outputs: [
        { address: OWN_ADDRESS, coins: 5_000_000n },
        { address: OTHER_ADDRESS, coins: 2_000_000n },
      ],
    });
    cache.recordOwnTransaction(tx1);

    expect(
      cache.resolveChainedInputs(spendingTxCbor(txIdOf(tx1), 1), OWN_ADDRESSES),
    ).toHaveLength(0);
  });

  it('returns no utxos for inputs of unknown transactions', () => {
    const cache = createChainedTxOutputCache();
    expect(
      cache.resolveChainedInputs(
        spendingTxCbor(dummyInput(2).txId, 0),
        OWN_ADDRESSES,
      ),
    ).toHaveLength(0);
  });

  it('returns no utxos for an out-of-range output index', () => {
    const cache = createChainedTxOutputCache();
    const tx1 = buildTxCbor({
      inputs: [dummyInput(3)],
      outputs: [{ address: OWN_ADDRESS, coins: 1_000_000n }],
    });
    cache.recordOwnTransaction(tx1);
    expect(
      cache.resolveChainedInputs(spendingTxCbor(txIdOf(tx1), 7), OWN_ADDRESSES),
    ).toHaveLength(0);
  });

  it('evicts the least recently used transaction beyond the cap', () => {
    const cache = createChainedTxOutputCache();
    const txs = Array.from({ length: 33 }, (_, index) =>
      buildTxCbor({
        inputs: [dummyInput(index + 1)],
        outputs: [{ address: OWN_ADDRESS, coins: 1_000_000n }],
      }),
    );
    for (const tx of txs) cache.recordOwnTransaction(tx);

    expect(
      cache.resolveChainedInputs(
        spendingTxCbor(txIdOf(txs[0]), 0),
        OWN_ADDRESSES,
      ),
    ).toHaveLength(0);
    expect(
      cache.resolveChainedInputs(
        spendingTxCbor(txIdOf(txs[1]), 0),
        OWN_ADDRESSES,
      ),
    ).toHaveLength(1);
  });

  it('a resolution hit refreshes recency so active chain roots survive eviction', () => {
    const cache = createChainedTxOutputCache();
    const txs = Array.from({ length: 32 }, (_, index) =>
      buildTxCbor({
        inputs: [dummyInput(index + 1)],
        outputs: [{ address: OWN_ADDRESS, coins: 1_000_000n }],
      }),
    );
    for (const tx of txs) cache.recordOwnTransaction(tx);

    cache.resolveChainedInputs(
      spendingTxCbor(txIdOf(txs[0]), 0),
      OWN_ADDRESSES,
    );
    cache.recordOwnTransaction(
      buildTxCbor({
        inputs: [dummyInput(40)],
        outputs: [{ address: OWN_ADDRESS, coins: 1_000_000n }],
      }),
    );

    expect(
      cache.resolveChainedInputs(
        spendingTxCbor(txIdOf(txs[0]), 0),
        OWN_ADDRESSES,
      ),
    ).toHaveLength(1);
    expect(
      cache.resolveChainedInputs(
        spendingTxCbor(txIdOf(txs[1]), 0),
        OWN_ADDRESSES,
      ),
    ).toHaveLength(0);
  });

  it('ignores unparseable cbor on record and resolve', () => {
    const cache = createChainedTxOutputCache();
    expect(() => {
      cache.recordOwnTransaction('not-cbor');
    }).not.toThrow();
    expect(cache.resolveChainedInputs('not-cbor', OWN_ADDRESSES)).toHaveLength(
      0,
    );
  });
});
