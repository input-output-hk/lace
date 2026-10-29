import { Cardano } from '@cardano-sdk/core';
import { ActivityType } from '@lace-contract/activities';
import { Milliseconds, Timestamp } from '@lace-lib/util';
import { TimeoutError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { openCardanoCustodyAccount } from '../../src/custody/cardano-custody-account-entity';
import { CardanoCustodyOperationExpiredError } from '../../src/custody/cardano-custody-errors';
import { waitForCardanoCustodyOperation } from '../../src/custody/wait-for-cardano-custody-operation';

import {
  agentGrantUtxo,
  createCustodyTestWallet,
  fundUtxo,
  grantedControl,
  liveControl,
  record,
} from './custody-fixtures';

import type { Activity } from '@lace-contract/activities';
import type { CardanoTransactionHistoryItem } from '@lace-contract/cardano-context';

const txId = Cardano.TransactionId('cd'.repeat(32));
const invalidHereafter = Cardano.Slot(1000);

const setup = async () => {
  const test = createCustodyTestWallet();
  const { accountId } = await openCardanoCustodyAccount(test.wallet, {
    record,
    name: 'Mine',
  });
  test.settledUtxos$.next({ [accountId]: [liveControl, fundUtxo] });
  const pending: Activity = {
    accountId,
    activityId: txId,
    timestamp: Timestamp(0),
    tokenBalanceChanges: [],
    type: ActivityType.Pending,
  };
  test.activities$.next({ [accountId]: [pending] });
  const wait = async (timeout?: Milliseconds) =>
    waitForCardanoCustodyOperation(test.wallet, {
      accountId,
      txId,
      invalidHereafter,
      ...(timeout === undefined ? {} : { timeout }),
    });
  return { ...test, accountId, wait };
};

type Setup = Awaited<ReturnType<typeof setup>>;

/** What the wallet's stale-activity side effect does once a sync round found the transaction nowhere. */
const dropPending = ({ activities$, accountId }: Setup) => {
  activities$.next({ [accountId]: [] });
};

const flush = async () => new Promise(resolve => setTimeout(resolve, 0));

const tipAt = (slot: number): Cardano.Tip => ({
  slot: Cardano.Slot(slot),
  blockNo: Cardano.BlockNo(1),
  hash: Cardano.BlockId('ef'.repeat(32)),
});

describe('waitForCardanoCustodyOperation', () => {
  it('resolves once the synced control UTxO is the transaction output', async () => {
    const { wait, settledUtxos$, accountId } = await setup();
    const waiting = wait();

    settledUtxos$.next({
      [accountId]: [
        [{ ...grantedControl[0], txId }, grantedControl[1]],
        fundUtxo,
      ],
    });

    expect((await waiting).unwrap()).toEqual({ txId });
  });

  it('resolves once a synced grant UTxO is the transaction output, as a grant spend recreates it', async () => {
    const { wait, settledUtxos$, accountId } = await setup();
    const waiting = wait();

    settledUtxos$.next({
      [accountId]: [
        grantedControl,
        [{ ...agentGrantUtxo[0], txId }, agentGrantUtxo[1]],
        fundUtxo,
      ],
    });

    expect((await waiting).unwrap()).toEqual({ txId });
  });

  it('does not settle on a fund output of the transaction', async () => {
    const setupResult = await setup();
    const { wait, settledUtxos$, accountId, tip$ } = setupResult;
    const waiting = wait();

    settledUtxos$.next({
      [accountId]: [liveControl, [{ ...fundUtxo[0], txId }, fundUtxo[1]]],
    });
    tip$.next(tipAt(invalidHereafter + 61));
    dropPending(setupResult);

    const result = await waiting;
    expect(result.isErr() && result.error).toBeInstanceOf(
      CardanoCustodyOperationExpiredError,
    );
  });

  describe('once the transaction is in the account history', () => {
    const inHistory = (
      transactionId: Cardano.TransactionId,
      blockNumber: number,
    ): CardanoTransactionHistoryItem => ({
      txId: transactionId,
      txIndex: Cardano.TxIndex(0),
      blockNumber: Cardano.BlockNo(blockNumber),
      blockTime: Timestamp(0),
    });
    const laterTxId = Cardano.TransactionId('ef'.repeat(32));

    /** The activity tracker's confirmed activity in place of the pending one. */
    const confirm = ({ activities$, accountId }: Setup) => {
      activities$.next({
        [accountId]: activities$.value[accountId].map(activity => ({
          ...activity,
          type: ActivityType.Send,
        })),
      });
    };

    it('waits while its activity is still pending', async () => {
      const setupResult = await setup();
      const { wait, history$, accountId, tip$, dispatch } = setupResult;
      const settled = vi.fn();
      void wait().then(settled);

      history$.next({ [accountId]: [inHistory(txId, 1)] });
      tip$.next(tipAt(invalidHereafter + 61));
      await flush();

      expect(settled).not.toHaveBeenCalled();
      expect(dispatch).not.toHaveBeenCalledWith(
        'activities.removeActivities',
        expect.anything(),
      );
    });

    it('waits until the UTxOs no longer hold the account UTxOs it spent', async () => {
      const setupResult = await setup();
      const { wait, history$, settledUtxos$, accountId } = setupResult;
      const settled = vi.fn();
      const waiting = wait();
      void waiting.then(settled);

      history$.next({ [accountId]: [inHistory(txId, 1)] });
      confirm(setupResult);
      await flush();
      expect(settled).not.toHaveBeenCalled();

      settledUtxos$.next({
        [accountId]: [
          [{ ...grantedControl[0], txId }, grantedControl[1]],
          fundUtxo,
        ],
      });
      expect((await waiting).unwrap()).toEqual({ txId });
    });

    it('resolves when a later transaction in the history spent its control output', async () => {
      const setupResult = await setup();
      const { wait, history$, settledUtxos$, accountId } = setupResult;
      const waiting = wait();

      history$.next({
        [accountId]: [inHistory(laterTxId, 2), inHistory(txId, 1)],
      });
      confirm(setupResult);
      settledUtxos$.next({
        [accountId]: [
          [{ ...grantedControl[0], txId: laterTxId }, grantedControl[1]],
          fundUtxo,
        ],
      });

      expect((await waiting).unwrap()).toEqual({ txId });
    });

    it('resolves when a later spend took its grant output, the control UTxO being older', async () => {
      const setupResult = await setup();
      const { wait, history$, settledUtxos$, accountId } = setupResult;
      const waiting = wait();

      history$.next({
        [accountId]: [
          inHistory(laterTxId, 3),
          inHistory(txId, 2),
          inHistory(grantedControl[0].txId, 1),
        ],
      });
      confirm(setupResult);
      settledUtxos$.next({
        [accountId]: [
          grantedControl,
          [{ ...agentGrantUtxo[0], txId: laterTxId }, agentGrantUtxo[1]],
        ],
      });

      expect((await waiting).unwrap()).toEqual({ txId });
    });

    it('does not take an earlier control output for a later one', async () => {
      const setupResult = await setup();
      const { wait, history$, accountId } = setupResult;
      const settled = vi.fn();
      void wait().then(settled);

      history$.next({
        [accountId]: [inHistory(txId, 2), inHistory(liveControl[0].txId, 1)],
      });
      confirm(setupResult);
      await flush();

      expect(settled).not.toHaveBeenCalled();
    });
  });

  describe('past the validity bound', () => {
    it('waits while the tip is within the validity bound and the provider lag', async () => {
      const setupResult = await setup();
      const { wait, tip$ } = setupResult;
      const settled = vi.fn();
      void wait().then(settled);

      tip$.next(tipAt(invalidHereafter + 60));
      dropPending(setupResult);
      await flush();

      expect(settled).not.toHaveBeenCalled();
    });

    it('waits while the wallet still holds its pending activity', async () => {
      const { wait, tip$, activities$, accountId } = await setup();
      const settled = vi.fn();
      void wait().then(settled);

      tip$.next(tipAt(invalidHereafter + 61));
      await flush();

      expect(settled).not.toHaveBeenCalled();
      expect(activities$.value[accountId]).toHaveLength(1);
    });

    it('settles a transaction the history shows after a long background', async () => {
      const setupResult = await setup();
      const { wait, tip$, history$, activities$, settledUtxos$, accountId } =
        setupResult;
      const waiting = wait();

      // The tip poll runs before the next sync round fetches the history.
      tip$.next(tipAt(invalidHereafter + 5000));
      await flush();
      history$.next({
        [accountId]: [
          {
            txId,
            txIndex: Cardano.TxIndex(0),
            blockNumber: Cardano.BlockNo(1),
            blockTime: Timestamp(0),
          },
        ],
      });
      activities$.next({
        [accountId]: activities$.value[accountId].map(activity => ({
          ...activity,
          type: ActivityType.Send,
        })),
      });
      settledUtxos$.next({
        [accountId]: [
          [{ ...grantedControl[0], txId }, grantedControl[1]],
          fundUtxo,
        ],
      });

      expect((await waiting).unwrap()).toEqual({ txId });
    });

    it('fails once the wallet dropped its pending activity, leaving the drop to the wallet', async () => {
      const setupResult = await setup();
      const { wait, tip$, dispatch } = setupResult;
      const waiting = wait();

      tip$.next(tipAt(invalidHereafter + 61));
      dropPending(setupResult);
      const result = await waiting;

      expect(result.isErr() && result.error).toEqual(
        new CardanoCustodyOperationExpiredError(txId, invalidHereafter),
      );
      expect(dispatch).not.toHaveBeenCalledWith(
        'activities.removeActivities',
        expect.anything(),
      );
    });

    it('fails when the wallet dropped the activity before the wait began', async () => {
      const setupResult = await setup();
      setupResult.tip$.next(tipAt(invalidHereafter + 61));
      dropPending(setupResult);

      const result = await setupResult.wait();

      expect(result.isErr() && result.error).toBeInstanceOf(
        CardanoCustodyOperationExpiredError,
      );
    });
  });

  it('gives up after its timeout', async () => {
    vi.useFakeTimers();
    try {
      const { wait } = await setup();
      const waiting = wait(Milliseconds(1000));

      await vi.advanceTimersByTimeAsync(1000);
      const result = await waiting;

      expect(result.isErr() && result.error).toBeInstanceOf(TimeoutError);
    } finally {
      vi.useRealTimers();
    }
  });

  it('refuses an account the wallet does not hold', async () => {
    const { wallet } = await setup();

    const result = await waitForCardanoCustodyOperation(wallet, {
      accountId: 'missing' as never,
      txId,
      invalidHereafter,
    });

    expect(result.isErr() && result.error).toMatchObject({
      reason: 'unknown-account',
    });
  });
});
