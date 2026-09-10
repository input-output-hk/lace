import { Serialization } from '@cardano-sdk/core';
import { describe, expect, it } from 'vitest';

import { estimateSignedTxSize } from '../src/estimate-signed-tx-size';

import type { Cardano } from '@cardano-sdk/core';

// Two distinct base addresses (different payment key hashes), so each resolved
// input contributes its own signer and the estimate responds to how many inputs
// resolve.
const ADDR_A =
  'addr_test1qpw0djgj0x59ngrjvqthn7enhvruxnsavsw5th63la3mjel3tkc974sr23jmlzgq5zda4gtv8k9cy38756r9y3qgmkqqjz6aa7' as Cardano.PaymentAddress;
const ADDR_B =
  'addr_test1qqwk0nt6a2hdae87w0k240nuezf2fra52qgemksdm4m0jffw0vfldkgjfgtdmlkyv3m374lps3t3lv7t379ncxn4tp5qlnk7yu' as Cardano.PaymentAddress;
const TX_ID =
  '0dc01a6e652d0ca5078d01caab25cc8243850ed6545eff77cda17a2dd0bab60c' as Cardano.TransactionId;

const utxoAt = (
  index: number,
  address: Cardano.PaymentAddress,
): Cardano.Utxo => [
  { txId: TX_ID, index, address },
  { address, value: { coins: 5_000_000n } },
];

// A minimal two-input tx spending ADDR_A (index 0) and ADDR_B (index 1).
const twoInputTx = (): Serialization.Transaction =>
  Serialization.Transaction.fromCore({
    id: TX_ID,
    body: {
      inputs: [
        { txId: TX_ID, index: 0 },
        { txId: TX_ID, index: 1 },
      ],
      outputs: [{ address: ADDR_A, value: { coins: 9_000_000n } }],
      fee: 200_000n,
    },
    witness: { signatures: new Map() },
  });

describe('estimateSignedTxSize', () => {
  it('adds a witness per unique signer, so the signed estimate exceeds the unsigned body', () => {
    const tx = twoInputTx();
    const signedSize = estimateSignedTxSize(tx, [
      utxoAt(0, ADDR_A),
      utxoAt(1, ADDR_B),
    ]);
    const unsignedSize = tx.toCbor().length / 2;
    expect(signedSize).toBeGreaterThan(unsignedSize);
  });

  it('shrinking the resolved-input set lowers the estimate (guards the under-count direction)', () => {
    const tx = twoInputTx();
    // Both inputs resolved: two distinct signers, two witnesses.
    const bothResolved = estimateSignedTxSize(tx, [
      utxoAt(0, ADDR_A),
      utxoAt(1, ADDR_B),
    ]);
    // Only one input resolved: one signer, one witness. An estimator that ignored
    // resolvedInputs would return the same size for both, under-counting witnesses
    // (the dangerous direction for a size guard).
    const oneResolved = estimateSignedTxSize(tx, [utxoAt(0, ADDR_A)]);
    expect(bothResolved).toBeGreaterThan(oneResolved);
  });
});
