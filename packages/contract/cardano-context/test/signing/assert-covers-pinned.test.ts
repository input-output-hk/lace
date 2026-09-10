import { describe, expect, it } from 'vitest';

import {
  assertTransactionCoversPinnedSet,
  SweepCoverageError,
} from '../../src/signing/assert-covers-pinned';

import type { CardanoRewardAccount } from '../../src/types';
import type { Cardano } from '@cardano-sdk/core';

const tx = (
  inputs: { txId: string; index: number }[],
  withdrawals: { stakeAddress: string }[] = [],
) =>
  ({
    toCore: () => ({ body: { inputs, withdrawals } }),
  } as never);

const utxo = (txId: string, index: number): Cardano.Utxo =>
  [{ txId, index }, {}] as unknown as Cardano.Utxo;

const rewardAccount = (value: string): CardanoRewardAccount =>
  value as CardanoRewardAccount;

describe('assertTransactionCoversPinnedSet', () => {
  it('passes when the tx spends every pinned input and withdraws every pinned reward account', () => {
    expect(() => {
      assertTransactionCoversPinnedSet(
        tx(
          [
            { txId: 'tx1', index: 0 },
            { txId: 'tx1', index: 1 },
          ],
          [{ stakeAddress: 'stake1' }],
        ),
        {
          utxos: [utxo('tx1', 0), utxo('tx1', 1)],
          withdrawalRewardAccounts: [rewardAccount('stake1')],
        },
      );
    }).not.toThrow();
  });

  it('throws with the missing input when a pinned UTxO is dropped from the tx', () => {
    let caught: unknown;
    try {
      assertTransactionCoversPinnedSet(tx([{ txId: 'tx1', index: 0 }]), {
        utxos: [utxo('tx1', 0), utxo('tx2', 3)],
        withdrawalRewardAccounts: [],
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(SweepCoverageError);
    expect((caught as SweepCoverageError).missingInputs).toEqual(['tx2#3']);
  });

  it('throws with the missing withdrawal when a pinned reward account is not withdrawn', () => {
    let caught: unknown;
    try {
      assertTransactionCoversPinnedSet(
        tx([{ txId: 'tx1', index: 0 }], [{ stakeAddress: 'stake1' }]),
        {
          utxos: [utxo('tx1', 0)],
          withdrawalRewardAccounts: [
            rewardAccount('stake1'),
            rewardAccount('stake2'),
          ],
        },
      );
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(SweepCoverageError);
    expect((caught as SweepCoverageError).missingWithdrawals).toEqual([
      'stake2',
    ]);
  });
});
