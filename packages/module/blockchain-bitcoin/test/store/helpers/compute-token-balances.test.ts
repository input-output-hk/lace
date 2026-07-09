import { describe, expect, it } from 'vitest';

import { computeBitcoinTokenBalances } from '../../../src/store/helpers/compute-token-balances';

import type {
  BitcoinTransactionHistoryEntry,
  BitcoinUTxO,
} from '@lace-contract/bitcoin-context';

const OWN = 'tb1qown';
const OTHER = 'tb1qexternal';

const utxo = (txId: string, index: number, satoshis: number): BitcoinUTxO => ({
  txId,
  index,
  satoshis,
  address: OWN,
  script: '',
  confirmations: 1,
  height: 0,
  runes: [],
  inscriptions: [],
});

const pendingTx = (
  transactionHash: string,
  inputs: { txId: string; index: number }[],
  outputs: { address: string; satoshis: number }[],
): BitcoinTransactionHistoryEntry => ({
  transactionHash,
  confirmations: 0,
  timestamp: 0,
  blockHeight: 0,
  status: 'Pending' as BitcoinTransactionHistoryEntry['status'],
  inputs: inputs.map(input => ({
    ...input,
    address: OWN,
    satoshis: 0,
    isCoinbase: false,
  })),
  outputs,
});

const ownAddresses = new Set([OWN]);

describe('computeBitcoinTokenBalances', () => {
  it('sums confirmed UTxOs when there are no pending transactions', () => {
    const result = computeBitcoinTokenBalances({
      confirmedUtxos: [utxo('a', 0, 1000), utxo('b', 1, 2500)],
      pendingTransactions: [],
      ownAddresses,
    });

    expect(result).toEqual({ available: 3500n, pending: 0n });
  });

  it('counts an unconfirmed incoming receive as pending without touching available', () => {
    const result = computeBitcoinTokenBalances({
      confirmedUtxos: [utxo('a', 0, 1000)],
      pendingTransactions: [
        pendingTx(
          'incoming',
          [{ txId: 'external', index: 0 }],
          [{ address: OWN, satoshis: 5000 }],
        ),
      ],
      ownAddresses,
    });

    expect(result).toEqual({ available: 1000n, pending: 5000n });
  });

  it('removes the in-flight spent UTxO from available and counts change as pending on an outgoing send', () => {
    // Spend the 10_000 confirmed UTxO; 3_000 to an external address, 6_900
    // change back to us (100 fee).
    const result = computeBitcoinTokenBalances({
      confirmedUtxos: [utxo('a', 0, 10_000)],
      pendingTransactions: [
        pendingTx(
          'send',
          [{ txId: 'a', index: 0 }],
          [
            { address: OTHER, satoshis: 3000 },
            { address: OWN, satoshis: 6900 },
          ],
        ),
      ],
      ownAddresses,
    });

    expect(result).toEqual({ available: 0n, pending: 6900n });
  });

  it('does not double-count a pending output that is spent by another pending tx', () => {
    // tx1 produces a 6_900 change output to us; tx2 spends that output.
    const result = computeBitcoinTokenBalances({
      confirmedUtxos: [utxo('a', 0, 10_000)],
      pendingTransactions: [
        pendingTx(
          'tx1',
          [{ txId: 'a', index: 0 }],
          [{ address: OWN, satoshis: 6900 }],
        ),
        pendingTx(
          'tx2',
          [{ txId: 'tx1', index: 0 }],
          [
            { address: OTHER, satoshis: 2000 },
            { address: OWN, satoshis: 4800 },
          ],
        ),
      ],
      ownAddresses,
    });

    // tx1's 6_900 output is consumed by tx2, so only tx2's 4_800 own output
    // counts as pending. The confirmed UTxO is spent, so available is 0.
    expect(result).toEqual({ available: 0n, pending: 4800n });
  });

  it('ignores pending outputs paying addresses we do not own', () => {
    const result = computeBitcoinTokenBalances({
      confirmedUtxos: [],
      pendingTransactions: [
        pendingTx(
          'incoming',
          [{ txId: 'external', index: 0 }],
          [{ address: OTHER, satoshis: 5000 }],
        ),
      ],
      ownAddresses,
    });

    expect(result).toEqual({ available: 0n, pending: 0n });
  });
});
