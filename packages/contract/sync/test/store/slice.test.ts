import { Percent } from '@cardano-sdk/util';
import {
  AccountId,
  WalletId,
  walletsActions,
} from '@lace-contract/wallet-repo';
import { Timestamp } from '@lace-sdk/util';
import { beforeEach, describe, expect, it } from 'vitest';

import { syncActions as actions } from '../../src/index';
import { syncReducers } from '../../src/store/slice';

import type { SyncSliceState, SyncOperation } from '../../src/types';

const accountId = AccountId('account1');

describe('sync slice', () => {
  let initialState: SyncSliceState;

  beforeEach(() => {
    initialState = {
      syncStatusByAccount: {},
    };
  });

  describe('reducers', () => {
    describe('addSyncOperation', () => {
      it('should add operation to existing pending sync', () => {
        const operation1: SyncOperation = {
          operationId: 'op1',
          status: 'Pending',
          description: 'sync.operation.address-discovery',
          startedAt: Timestamp(Date.now()),
        };

        const operation2: SyncOperation = {
          operationId: 'op2',
          status: 'Pending',
          description: 'sync.operation.tokens',
          startedAt: Timestamp(Date.now()),
        };

        let state = syncReducers.sync(
          initialState,
          actions.sync.addSyncOperation({ accountId, operation: operation1 }),
        );

        state = syncReducers.sync(
          state,
          actions.sync.addSyncOperation({ accountId, operation: operation2 }),
        );

        expect(state.syncStatusByAccount[accountId]?.pendingSync).toBeDefined();
        expect(
          state.syncStatusByAccount[accountId]?.pendingSync?.operations,
        ).toHaveProperty('op1');
        expect(
          state.syncStatusByAccount[accountId]?.pendingSync?.operations,
        ).toHaveProperty('op2');
      });

      it('should auto-initialize pendingSync if it does not exist', () => {
        const operation: SyncOperation = {
          operationId: 'op1',
          status: 'Pending',
          description: 'sync.operation.address-discovery',
          startedAt: Timestamp(Date.now()),
        };

        const state = syncReducers.sync(
          initialState,
          actions.sync.addSyncOperation({ accountId, operation }),
        );

        expect(state.syncStatusByAccount[accountId]?.pendingSync).toBeDefined();
        expect(
          state.syncStatusByAccount[accountId]?.pendingSync?.operations.op1,
        ).toEqual(operation);
      });

      it('should auto-initialize account status if account does not exist', () => {
        const operation: SyncOperation = {
          operationId: 'op1',
          status: 'Pending',
          description: 'sync.operation.address-discovery',
          startedAt: Timestamp(Date.now()),
        };

        const state = syncReducers.sync(
          initialState,
          actions.sync.addSyncOperation({ accountId, operation }),
        );

        expect(state.syncStatusByAccount[accountId]).toBeDefined();
        expect(state.syncStatusByAccount[accountId]?.pendingSync).toBeDefined();
      });

      it('should preserve lastSuccessfulSync when auto-initializing pendingSync', () => {
        const lastSuccessfulSync = Timestamp(Date.now() - 10000);
        const stateWithLastSync: SyncSliceState = {
          syncStatusByAccount: {
            [accountId]: {
              lastSuccessfulSync,
            },
          },
        };

        const operation: SyncOperation = {
          operationId: 'op1',
          status: 'Pending',
          description: 'sync.operation.address-discovery',
          startedAt: Timestamp(Date.now()),
        };

        const state = syncReducers.sync(
          stateWithLastSync,
          actions.sync.addSyncOperation({ accountId, operation }),
        );

        expect(
          state.syncStatusByAccount[accountId]?.lastSuccessfulSync,
        ).toEqual(lastSuccessfulSync);
        expect(state.syncStatusByAccount[accountId]?.pendingSync).toBeDefined();
      });
    });

    describe('updateSyncOperation', () => {
      it('should update operation status', () => {
        const operation: SyncOperation = {
          operationId: 'op1',
          status: 'Pending',
          description: 'sync.operation.address-discovery',
          startedAt: Timestamp(Date.now()),
        };

        let state = syncReducers.sync(
          initialState,
          actions.sync.addSyncOperation({ accountId, operation }),
        );

        state = syncReducers.sync(
          state,
          actions.sync.updateSyncOperation({
            accountId,
            operationId: 'op1',
            update: {
              status: 'InProgress',
              type: 'Indeterminate',
            } as Partial<SyncOperation>,
          }),
        );

        const updatedOp =
          state.syncStatusByAccount[accountId]?.pendingSync?.operations.op1;
        expect(updatedOp?.status).toBe('InProgress');
      });

      it('should update progress for determinate operations', () => {
        const operation: SyncOperation = {
          operationId: 'op1',
          status: 'InProgress',
          type: 'Determinate',
          progress: Percent(0),
          description: 'sync.operation.tokens',
          startedAt: Timestamp(Date.now()),
        };

        let state = syncReducers.sync(
          initialState,
          actions.sync.addSyncOperation({ accountId, operation }),
        );

        state = syncReducers.sync(
          state,
          actions.sync.updateSyncProgress({
            accountId,
            operationId: 'op1',
            progress: Percent(0.5),
          }),
        );

        const updatedOp =
          state.syncStatusByAccount[accountId]?.pendingSync?.operations.op1;
        expect(updatedOp).toHaveProperty('progress', Percent(0.5));
      });
    });

    describe('completeSyncOperation', () => {
      it('should mark operation as completed with timestamp', () => {
        const operation1: SyncOperation = {
          operationId: 'op1',
          status: 'Pending',
          description: 'sync.operation.address-discovery',
          startedAt: Timestamp(Date.now()),
        };

        const operation2: SyncOperation = {
          operationId: 'op2',
          status: 'Pending',
          description: 'sync.operation.tokens',
          startedAt: Timestamp(Date.now()),
        };

        let state = syncReducers.sync(
          initialState,
          actions.sync.addSyncOperation({ accountId, operation: operation1 }),
        );

        state = syncReducers.sync(
          state,
          actions.sync.addSyncOperation({ accountId, operation: operation2 }),
        );

        const beforeComplete = Date.now();
        state = syncReducers.sync(
          state,
          actions.sync.completeSyncOperation({ accountId, operationId: 'op1' }),
        );
        const afterComplete = Date.now();

        // Operation should still be in pendingSync because op2 is still pending
        const completedOp =
          state.syncStatusByAccount[accountId]?.pendingSync?.operations.op1;
        expect(completedOp?.status).toBe('Completed');
        expect(completedOp).toHaveProperty('completedAt');
        if ('completedAt' in completedOp!) {
          expect(completedOp.completedAt).toBeGreaterThanOrEqual(
            beforeComplete,
          );
          expect(completedOp.completedAt).toBeLessThanOrEqual(afterComplete);
        }
      });

      it('should keep pendingSync when other operations are still pending', () => {
        const operation1: SyncOperation = {
          operationId: 'op1',
          status: 'Pending',
          description: 'sync.operation.address-discovery',
          startedAt: Timestamp(Date.now()),
        };

        const operation2: SyncOperation = {
          operationId: 'op2',
          status: 'Pending',
          description: 'sync.operation.tokens',
          startedAt: Timestamp(Date.now()),
        };

        let state = syncReducers.sync(
          initialState,
          actions.sync.addSyncOperation({ accountId, operation: operation1 }),
        );

        state = syncReducers.sync(
          state,
          actions.sync.addSyncOperation({ accountId, operation: operation2 }),
        );

        state = syncReducers.sync(
          state,
          actions.sync.completeSyncOperation({ accountId, operationId: 'op1' }),
        );

        expect(state.syncStatusByAccount[accountId]?.pendingSync).toBeDefined();
      });

      it('should auto-complete account sync when all operations are completed', () => {
        const operation1: SyncOperation = {
          operationId: 'op1',
          status: 'Pending',
          description: 'sync.operation.address-discovery',
          startedAt: Timestamp(Date.now()),
        };

        const operation2: SyncOperation = {
          operationId: 'op2',
          status: 'Pending',
          description: 'sync.operation.tokens',
          startedAt: Timestamp(Date.now()),
        };

        let state = syncReducers.sync(
          initialState,
          actions.sync.addSyncOperation({ accountId, operation: operation1 }),
        );

        state = syncReducers.sync(
          state,
          actions.sync.addSyncOperation({ accountId, operation: operation2 }),
        );

        state = syncReducers.sync(
          state,
          actions.sync.completeSyncOperation({ accountId, operationId: 'op1' }),
        );

        const beforeLastComplete = Date.now();
        state = syncReducers.sync(
          state,
          actions.sync.completeSyncOperation({ accountId, operationId: 'op2' }),
        );
        const afterLastComplete = Date.now();

        expect(
          state.syncStatusByAccount[accountId]?.pendingSync,
        ).toBeUndefined();
        expect(
          state.syncStatusByAccount[accountId]?.lastSuccessfulSync,
        ).toBeDefined();
        expect(
          state.syncStatusByAccount[accountId].lastSuccessfulSync!,
        ).toBeGreaterThanOrEqual(beforeLastComplete);
        expect(
          state.syncStatusByAccount[accountId].lastSuccessfulSync!,
        ).toBeLessThanOrEqual(afterLastComplete);
      });

      it('should clear pendingSync but not set lastSuccessfulSync when completing after a failure', () => {
        const operation1: SyncOperation = {
          operationId: 'op1',
          status: 'Pending',
          description: 'sync.operation.address-discovery',
          startedAt: Timestamp(Date.now()),
        };

        const operation2: SyncOperation = {
          operationId: 'op2',
          status: 'Pending',
          description: 'sync.operation.tokens',
          startedAt: Timestamp(Date.now()),
        };

        let state = syncReducers.sync(
          initialState,
          actions.sync.addSyncOperation({ accountId, operation: operation1 }),
        );

        state = syncReducers.sync(
          state,
          actions.sync.addSyncOperation({ accountId, operation: operation2 }),
        );

        // Fail first operation
        state = syncReducers.sync(
          state,
          actions.sync.failSyncOperation({
            accountId,
            operationId: 'op1',
            error: 'sync.error.address-discovery-failed',
          }),
        );

        // Complete second operation
        state = syncReducers.sync(
          state,
          actions.sync.completeSyncOperation({ accountId, operationId: 'op2' }),
        );

        expect(
          state.syncStatusByAccount[accountId]?.pendingSync,
        ).toBeUndefined();
        expect(
          state.syncStatusByAccount[accountId]?.lastSuccessfulSync,
        ).toBeUndefined();
      });
    });

    describe('failSyncOperation', () => {
      it('should mark operation as failed with error message', () => {
        const operation1: SyncOperation = {
          operationId: 'op1',
          status: 'Pending',
          description: 'sync.operation.address-discovery',
          startedAt: Timestamp(Date.now()),
        };

        const operation2: SyncOperation = {
          operationId: 'op2',
          status: 'Pending',
          description: 'sync.operation.tokens',
          startedAt: Timestamp(Date.now()),
        };

        let state = syncReducers.sync(
          initialState,
          actions.sync.addSyncOperation({ accountId, operation: operation1 }),
        );

        state = syncReducers.sync(
          state,
          actions.sync.addSyncOperation({ accountId, operation: operation2 }),
        );

        const beforeFail = Date.now();
        state = syncReducers.sync(
          state,
          actions.sync.failSyncOperation({
            accountId,
            operationId: 'op1',
            error: 'sync.error.address-discovery-failed',
          }),
        );
        const afterFail = Date.now();

        // Operation should still be in pendingSync because op2 is still pending
        const failedOp =
          state.syncStatusByAccount[accountId]?.pendingSync?.operations.op1;
        expect(failedOp?.status).toBe('Failed');
        expect(failedOp).toHaveProperty(
          'error',
          'sync.error.address-discovery-failed',
        );
        expect(failedOp).toHaveProperty('failedAt');
        if ('failedAt' in failedOp!) {
          expect(failedOp.failedAt).toBeGreaterThanOrEqual(beforeFail);
          expect(failedOp.failedAt).toBeLessThanOrEqual(afterFail);
        }
      });

      it('should keep pendingSync when other operations are still pending', () => {
        const operation1: SyncOperation = {
          operationId: 'op1',
          status: 'Pending',
          description: 'sync.operation.address-discovery',
          startedAt: Timestamp(Date.now()),
        };

        const operation2: SyncOperation = {
          operationId: 'op2',
          status: 'Pending',
          description: 'sync.operation.tokens',
          startedAt: Timestamp(Date.now()),
        };

        let state = syncReducers.sync(
          initialState,
          actions.sync.addSyncOperation({ accountId, operation: operation1 }),
        );

        state = syncReducers.sync(
          state,
          actions.sync.addSyncOperation({ accountId, operation: operation2 }),
        );

        state = syncReducers.sync(
          state,
          actions.sync.failSyncOperation({
            accountId,
            operationId: 'op1',
            error: 'sync.error.address-discovery-failed',
          }),
        );

        expect(state.syncStatusByAccount[accountId]?.pendingSync).toBeDefined();
      });

      it('should clear pendingSync but not set lastSuccessfulSync when all operations are terminal', () => {
        const operation1: SyncOperation = {
          operationId: 'op1',
          status: 'Pending',
          description: 'sync.operation.address-discovery',
          startedAt: Timestamp(Date.now()),
        };

        const operation2: SyncOperation = {
          operationId: 'op2',
          status: 'Pending',
          description: 'sync.operation.tokens',
          startedAt: Timestamp(Date.now()),
        };

        let state = syncReducers.sync(
          initialState,
          actions.sync.addSyncOperation({ accountId, operation: operation1 }),
        );

        state = syncReducers.sync(
          state,
          actions.sync.addSyncOperation({ accountId, operation: operation2 }),
        );

        state = syncReducers.sync(
          state,
          actions.sync.completeSyncOperation({ accountId, operationId: 'op1' }),
        );

        state = syncReducers.sync(
          state,
          actions.sync.failSyncOperation({
            accountId,
            operationId: 'op2',
            error: 'sync.error.tokens-fetch-failed',
          }),
        );

        expect(
          state.syncStatusByAccount[accountId]?.pendingSync,
        ).toBeUndefined();
        expect(
          state.syncStatusByAccount[accountId]?.lastSuccessfulSync,
        ).toBeUndefined();
      });
    });

    describe('markAccountAsSynced', () => {
      it('should set lastSuccessfulSync on a new account entry', () => {
        const beforeMark = Date.now();
        const state = syncReducers.sync(
          initialState,
          actions.sync.markAccountAsSynced({ accountId }),
        );
        const afterMark = Date.now();

        expect(
          state.syncStatusByAccount[accountId]?.lastSuccessfulSync,
        ).toBeDefined();
        expect(
          state.syncStatusByAccount[accountId].lastSuccessfulSync!,
        ).toBeGreaterThanOrEqual(beforeMark);
        expect(
          state.syncStatusByAccount[accountId].lastSuccessfulSync!,
        ).toBeLessThanOrEqual(afterMark);
      });

      it('should set lastSuccessfulSync on an existing account entry without clearing pendingSync', () => {
        const operation: SyncOperation = {
          operationId: 'op1',
          status: 'Pending',
          description: 'sync.operation.address-discovery',
          startedAt: Timestamp(Date.now()),
        };

        let state = syncReducers.sync(
          initialState,
          actions.sync.addSyncOperation({ accountId, operation }),
        );

        state = syncReducers.sync(
          state,
          actions.sync.markAccountAsSynced({ accountId }),
        );

        expect(
          state.syncStatusByAccount[accountId]?.lastSuccessfulSync,
        ).toBeDefined();
        expect(state.syncStatusByAccount[accountId]?.pendingSync).toBeDefined();
      });
    });

    describe('removeWallet extraReducer', () => {
      it('should remove sync status for all provided accounts', () => {
        const secondAccountId = AccountId('account2');
        const state: SyncSliceState = {
          syncStatusByAccount: {
            [accountId]: { lastSuccessfulSync: Timestamp(Date.now()) },
            [secondAccountId]: { lastSuccessfulSync: Timestamp(Date.now()) },
          },
        };

        const newState = syncReducers.sync(
          state,
          walletsActions.wallets.removeWallet(WalletId('wallet1'), [
            accountId,
            secondAccountId,
          ]),
        );

        expect(newState.syncStatusByAccount).toEqual({});
      });
    });
  });
});
