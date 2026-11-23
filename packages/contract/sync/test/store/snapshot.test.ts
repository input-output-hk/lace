import { Percent } from '@cardano-sdk/util';
import { AccountId } from '@lace-contract/wallet-repo';
import { Timestamp } from '@lace-lib/util';
import { describe, expect, it } from 'vitest';

import { syncActions, syncReducers } from '../../src/store/slice';

import type {
  SyncOperation,
  SyncOperationInProgressDeterminate,
  SyncSliceState,
} from '../../src/types';

const accountId = AccountId('snapshot-account');
const progress = (
  overrides: Partial<SyncOperationInProgressDeterminate> = {},
): SyncOperation => ({
  operationId: 'sync',
  description: 'sync.operation.midnight-wallet-sync',
  startedAt: Timestamp(10),
  status: 'InProgress',
  type: 'Determinate',
  progress: Percent(0.9),
  ...overrides,
});
const complete = (): SyncOperation => ({
  operationId: 'sync',
  description: 'sync.operation.midnight-wallet-sync',
  startedAt: Timestamp(20),
  status: 'Completed',
  completedAt: Timestamp(30),
});
const failed = (): SyncOperation => ({
  operationId: 'sync',
  description: 'sync.operation.midnight-wallet-sync',
  startedAt: Timestamp(20),
  status: 'Failed',
  failedAt: Timestamp(30),
  error: 'sync.error.midnight-sync-failed',
});
const apply = (state: SyncSliceState | undefined, operation: SyncOperation) =>
  syncReducers.sync(
    state,
    syncActions.sync.applySyncOperationSnapshot({ accountId, operation }),
  );

describe('applySyncOperationSnapshot', () => {
  it('creates an operation and preserves its start time across progress and type changes', () => {
    const first = apply(undefined, progress());
    const next = apply(first, {
      operationId: 'sync',
      description: 'sync.operation.midnight-wallet-sync',
      startedAt: Timestamp(99),
      status: 'InProgress',
      type: 'Indeterminate',
      statusDetail: 'v2.sync-status.detail.check-failed',
    });
    expect(next.syncStatusByAccount[accountId].pendingSync).toEqual({
      startedAt: 10,
      operations: {
        sync: {
          operationId: 'sync',
          description: 'sync.operation.midnight-wallet-sync',
          startedAt: 10,
          status: 'InProgress',
          type: 'Indeterminate',
          statusDetail: 'v2.sync-status.detail.check-failed',
        },
      },
    });
    const recovered = apply(next, progress({ startedAt: Timestamp(100) }));
    expect(
      recovered.syncStatusByAccount[accountId].pendingSync?.operations.sync,
    ).toEqual(progress());
  });

  it('records initial completion and recreates pending work on a subsequent snapshot', () => {
    const completed = apply(undefined, complete());
    const completedAccount = completed.syncStatusByAccount[accountId];
    expect(completedAccount.pendingSync).toBeUndefined();
    expect(completedAccount.lastSuccessfulSync).toEqual(expect.any(Number));
    const next = apply(completed, progress({ startedAt: Timestamp(40) }));
    expect(next.syncStatusByAccount[accountId].lastSuccessfulSync).toBe(
      completedAccount.lastSuccessfulSync,
    );
    expect(next.syncStatusByAccount[accountId].pendingSync?.startedAt).toBe(40);
    expect(
      next.syncStatusByAccount[accountId].pendingSync?.operations.sync,
    ).toMatchObject({ status: 'InProgress', startedAt: 40 });
  });

  it('keeps a failed health snapshot visible despite earlier success and clears its error on recovery', () => {
    const completed = apply(undefined, complete());
    const unhealthy = apply(completed, failed());
    expect(
      unhealthy.syncStatusByAccount[accountId].pendingSync?.operations.sync,
    ).toEqual(failed());
    expect(unhealthy.syncStatusByAccount[accountId].lastSuccessfulSync).toBe(
      completed.syncStatusByAccount[accountId].lastSuccessfulSync,
    );
    const recovered = apply(unhealthy, progress({ startedAt: Timestamp(50) }));
    expect(
      recovered.syncStatusByAccount[accountId].pendingSync?.operations.sync,
    ).toEqual(progress({ startedAt: Timestamp(50) }));
  });

  it('preserves unrelated operations and accounts when one operation completes', () => {
    const other = progress({ operationId: 'other' });
    const otherAccount = AccountId('other-account');
    let state = apply(undefined, other);
    state = syncReducers.sync(
      state,
      syncActions.sync.addSyncOperation({
        accountId: otherAccount,
        operation: other,
      }),
    );
    const next = apply(state, complete());
    expect(next.syncStatusByAccount[otherAccount]).toBe(
      state.syncStatusByAccount[otherAccount],
    );
    expect(next.syncStatusByAccount[accountId].pendingSync?.operations).toEqual(
      { other, sync: complete() },
    );
    expect(
      next.syncStatusByAccount[accountId].lastSuccessfulSync,
    ).toBeUndefined();
    const done = apply(next, { ...complete(), operationId: 'other' });
    expect(done.syncStatusByAccount[accountId].pendingSync).toBeUndefined();
    expect(done.syncStatusByAccount[accountId].lastSuccessfulSync).toEqual(
      expect.any(Number),
    );
  });

  it('records a failed round if another operation failed before completion', () => {
    const state = apply(undefined, { ...failed(), operationId: 'other' });
    const next = apply(state, complete());
    expect(next.syncStatusByAccount[accountId].pendingSync).toBeUndefined();
    expect(
      next.syncStatusByAccount[accountId].lastSuccessfulSync,
    ).toBeUndefined();
    expect(next.syncStatusByAccount[accountId].lastFailedSync).toEqual(
      expect.any(Number),
    );
  });
});
