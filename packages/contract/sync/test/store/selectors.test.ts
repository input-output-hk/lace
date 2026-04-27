import { Percent } from '@cardano-sdk/util';
import { AccountId, WalletId } from '@lace-contract/wallet-repo';
import { Timestamp } from '@lace-sdk/util';
import { describe, expect, it } from 'vitest';

import {
  selectGlobalSyncStatus,
  selectAverageSyncProgress,
  selectAllFailedOperations,
  selectActiveAccountSyncProgress,
  computeAccountSyncingProgress,
} from '../../src/store/selectors';

import type { SyncSliceState, SyncOperation } from '../../src/types';

const accountId1 = AccountId('account1');
const accountId2 = AccountId('account2');

describe('sync selectors', () => {
  describe('selectGlobalSyncStatus', () => {
    it('should return "idle" when no accounts exist', () => {
      const state: SyncSliceState = {
        syncStatusByAccount: {},
      };

      const status = selectGlobalSyncStatus.resultFunc(
        state.syncStatusByAccount,
      );
      expect(status).toBe('idle');
    });

    it('should return "syncing" when any account has pending sync', () => {
      const state: SyncSliceState = {
        syncStatusByAccount: {
          [accountId1]: {
            pendingSync: {
              startedAt: Timestamp(Date.now()),
              operations: {
                op1: {
                  operationId: 'op1',
                  status: 'InProgress',
                  type: 'Indeterminate',
                  description: 'sync.operation.address-discovery',
                  startedAt: Timestamp(Date.now()),
                },
              },
            },
          },
          [accountId2]: {
            lastSuccessfulSync: Timestamp(Date.now()),
          },
        },
      };

      const status = selectGlobalSyncStatus.resultFunc(
        state.syncStatusByAccount,
      );
      expect(status).toBe('syncing');
    });

    it('should return "error" when any operation failed', () => {
      const state: SyncSliceState = {
        syncStatusByAccount: {
          [accountId1]: {
            pendingSync: {
              startedAt: Timestamp(Date.now()),
              operations: {
                op1: {
                  operationId: 'op1',
                  status: 'Failed',
                  description: 'sync.operation.address-discovery',
                  startedAt: Timestamp(Date.now()),
                  failedAt: Timestamp(Date.now()),
                  error: 'sync.error.address-discovery-failed',
                },
              },
            },
          },
        },
      };

      const status = selectGlobalSyncStatus.resultFunc(
        state.syncStatusByAccount,
      );
      expect(status).toBe('error');
    });

    it('should return "synced" when all accounts synced successfully', () => {
      const state: SyncSliceState = {
        syncStatusByAccount: {
          [accountId1]: {
            lastSuccessfulSync: Timestamp(Date.now()),
          },
          [accountId2]: {
            lastSuccessfulSync: Timestamp(Date.now()),
          },
        },
      };

      const status = selectGlobalSyncStatus.resultFunc(
        state.syncStatusByAccount,
      );
      expect(status).toBe('synced');
    });

    it('should return "idle" when accounts exist but have no sync data', () => {
      const state: SyncSliceState = {
        syncStatusByAccount: {
          [accountId1]: {},
          [accountId2]: {},
        },
      };

      const status = selectGlobalSyncStatus.resultFunc(
        state.syncStatusByAccount,
      );
      expect(status).toBe('idle');
    });

    it('should return "synced" when synced accounts are mixed with accounts that have no sync data', () => {
      const state: SyncSliceState = {
        syncStatusByAccount: {
          [accountId1]: {
            lastSuccessfulSync: Timestamp(Date.now()),
          },
          [accountId2]: {},
        },
      };

      const status = selectGlobalSyncStatus.resultFunc(
        state.syncStatusByAccount,
      );
      expect(status).toBe('synced');
    });
  });

  describe('selectAverageSyncProgress', () => {
    it('should return 1 when no accounts syncing', () => {
      const state: SyncSliceState = {
        syncStatusByAccount: {
          [accountId1]: {
            lastSuccessfulSync: Timestamp(Date.now()),
          },
        },
      };

      const progress = selectAverageSyncProgress.resultFunc(
        state.syncStatusByAccount,
      );
      expect(progress).toBe(1);
    });

    it('should calculate average across multiple accounts', () => {
      const state: SyncSliceState = {
        syncStatusByAccount: {
          [accountId1]: {
            pendingSync: {
              startedAt: Timestamp(Date.now()),
              operations: {
                op1: {
                  operationId: 'op1',
                  status: 'InProgress',
                  type: 'Determinate',
                  progress: Percent(0.5),
                  description: 'sync.operation.tokens',
                  startedAt: Timestamp(Date.now()),
                },
              },
            },
          },
          [accountId2]: {
            pendingSync: {
              startedAt: Timestamp(Date.now()),
              operations: {
                op2: {
                  operationId: 'op2',
                  status: 'InProgress',
                  type: 'Determinate',
                  progress: Percent(0.3),
                  description: 'sync.operation.tokens',
                  startedAt: Timestamp(Date.now()),
                },
              },
            },
          },
        },
      };

      const progress = selectAverageSyncProgress.resultFunc(
        state.syncStatusByAccount,
      );
      // Average of 0.5 and 0.3 = 0.4
      expect(progress).toBeCloseTo(0.4, 5);
    });

    it('should ignore indeterminate operations in calculation', () => {
      const state: SyncSliceState = {
        syncStatusByAccount: {
          [accountId1]: {
            pendingSync: {
              startedAt: Timestamp(Date.now()),
              operations: {
                op1: {
                  operationId: 'op1',
                  status: 'InProgress',
                  type: 'Indeterminate',
                  description: 'sync.operation.address-discovery',
                  startedAt: Timestamp(Date.now()),
                },
                op2: {
                  operationId: 'op2',
                  status: 'InProgress',
                  type: 'Determinate',
                  progress: Percent(0.6),
                  description: 'sync.operation.tokens',
                  startedAt: Timestamp(Date.now()),
                },
              },
            },
          },
        },
      };

      const progress = selectAverageSyncProgress.resultFunc(
        state.syncStatusByAccount,
      );
      // Only the determinate operation (0.6) should be counted
      expect(progress).toBe(0.6);
    });

    it('should return 0 when account has only indeterminate operations', () => {
      const state: SyncSliceState = {
        syncStatusByAccount: {
          [accountId1]: {
            pendingSync: {
              startedAt: Timestamp(Date.now()),
              operations: {
                op1: {
                  operationId: 'op1',
                  status: 'InProgress',
                  type: 'Indeterminate',
                  description: 'sync.operation.address-discovery',
                  startedAt: Timestamp(Date.now()),
                },
              },
            },
          },
        },
      };

      const progress = selectAverageSyncProgress.resultFunc(
        state.syncStatusByAccount,
      );
      expect(progress).toBe(0);
    });

    it('should calculate average for account with multiple determinate operations', () => {
      const state: SyncSliceState = {
        syncStatusByAccount: {
          [accountId1]: {
            pendingSync: {
              startedAt: Timestamp(Date.now()),
              operations: {
                op1: {
                  operationId: 'op1',
                  status: 'InProgress',
                  type: 'Determinate',
                  progress: Percent(0.2),
                  description: 'sync.operation.tokens',
                  startedAt: Timestamp(Date.now()),
                },
                op2: {
                  operationId: 'op2',
                  status: 'InProgress',
                  type: 'Determinate',
                  progress: Percent(0.8),
                  description: 'sync.operation.token-metadata',
                  startedAt: Timestamp(Date.now()),
                },
              },
            },
          },
        },
      };

      const progress = selectAverageSyncProgress.resultFunc(
        state.syncStatusByAccount,
      );
      // Average of 0.2 and 0.8 = 0.5
      expect(progress).toBe(0.5);
    });
  });

  describe('selectAllFailedOperations', () => {
    it('should collect all failed operations across accounts', () => {
      const failedOp1: SyncOperation = {
        operationId: 'op1',
        status: 'Failed',
        description: 'sync.operation.address-discovery',
        startedAt: Timestamp(Date.now()),
        failedAt: Timestamp(Date.now()),
        error: 'sync.error.address-discovery-failed',
      };

      const failedOp2: SyncOperation = {
        operationId: 'op2',
        status: 'Failed',
        description: 'sync.operation.tokens',
        startedAt: Timestamp(Date.now()),
        failedAt: Timestamp(Date.now()),
        error: 'sync.error.tokens-fetch-failed',
      };

      const state: SyncSliceState = {
        syncStatusByAccount: {
          [accountId1]: {
            pendingSync: {
              startedAt: Timestamp(Date.now()),
              operations: {
                op1: failedOp1,
              },
            },
          },
          [accountId2]: {
            pendingSync: {
              startedAt: Timestamp(Date.now()),
              operations: {
                op2: failedOp2,
              },
            },
          },
        },
      };

      const failedOps = selectAllFailedOperations.resultFunc(
        state.syncStatusByAccount,
      );

      expect(failedOps).toHaveLength(2);
      expect(failedOps).toContainEqual({
        accountId: accountId1,
        operation: failedOp1,
      });
      expect(failedOps).toContainEqual({
        accountId: accountId2,
        operation: failedOp2,
      });
    });

    it('should include accountId with each failed operation', () => {
      const failedOp: SyncOperation = {
        operationId: 'op1',
        status: 'Failed',
        description: 'sync.operation.address-discovery',
        startedAt: Timestamp(Date.now()),
        failedAt: Timestamp(Date.now()),
        error: 'sync.error.address-discovery-failed',
      };

      const state: SyncSliceState = {
        syncStatusByAccount: {
          [accountId1]: {
            pendingSync: {
              startedAt: Timestamp(Date.now()),
              operations: {
                op1: failedOp,
              },
            },
          },
        },
      };

      const failedOps = selectAllFailedOperations.resultFunc(
        state.syncStatusByAccount,
      );

      expect(failedOps).toHaveLength(1);
      expect(failedOps[0]).toEqual({
        accountId: accountId1,
        operation: failedOp,
      });
    });

    it('should return empty array when no failed operations exist', () => {
      const state: SyncSliceState = {
        syncStatusByAccount: {
          [accountId1]: {
            pendingSync: {
              startedAt: Timestamp(Date.now()),
              operations: {
                op1: {
                  operationId: 'op1',
                  status: 'InProgress',
                  type: 'Indeterminate',
                  description: 'sync.operation.address-discovery',
                  startedAt: Timestamp(Date.now()),
                },
              },
            },
          },
        },
      };

      const failedOps = selectAllFailedOperations.resultFunc(
        state.syncStatusByAccount,
      );

      expect(failedOps).toEqual([]);
    });

    it('should only return failed operations, not completed ones', () => {
      const state: SyncSliceState = {
        syncStatusByAccount: {
          [accountId1]: {
            pendingSync: {
              startedAt: Timestamp(Date.now()),
              operations: {
                op1: {
                  operationId: 'op1',
                  status: 'Completed',
                  description: 'sync.operation.address-discovery',
                  startedAt: Timestamp(Date.now()),
                  completedAt: Timestamp(Date.now()),
                },
                op2: {
                  operationId: 'op2',
                  status: 'Failed',
                  description: 'sync.operation.tokens',
                  startedAt: Timestamp(Date.now()),
                  failedAt: Timestamp(Date.now()),
                  error: 'sync.error.tokens-fetch-failed',
                },
              },
            },
          },
        },
      };

      const failedOps = selectAllFailedOperations.resultFunc(
        state.syncStatusByAccount,
      );

      expect(failedOps).toHaveLength(1);
      expect(failedOps[0].operation.operationId).toBe('op2');
    });
  });

  describe('selectActiveAccountSyncProgress', () => {
    const walletId = WalletId('wallet1');

    it('should return 1 when there is no active account context', () => {
      const state: SyncSliceState = {
        syncStatusByAccount: {
          [accountId1]: {
            pendingSync: {
              startedAt: Timestamp(Date.now()),
              operations: {
                op1: {
                  operationId: 'op1',
                  status: 'InProgress',
                  type: 'Determinate',
                  progress: Percent(0.5),
                  description: 'sync.operation.midnight-wallet-sync',
                  startedAt: Timestamp(Date.now()),
                },
              },
            },
          },
        },
      };

      const progress = selectActiveAccountSyncProgress.resultFunc(
        state.syncStatusByAccount,
        null,
      );
      expect(progress).toBe(1);
    });

    it('should return 1 when active account has no pending sync', () => {
      const state: SyncSliceState = {
        syncStatusByAccount: {
          [accountId1]: {
            lastSuccessfulSync: Timestamp(Date.now()),
          },
        },
      };

      const progress = selectActiveAccountSyncProgress.resultFunc(
        state.syncStatusByAccount,
        { walletId, accountId: accountId1 },
      );
      expect(progress).toBe(1);
    });

    it('should return 0 when active account has only indeterminate operations', () => {
      const state: SyncSliceState = {
        syncStatusByAccount: {
          [accountId1]: {
            pendingSync: {
              startedAt: Timestamp(Date.now()),
              operations: {
                op1: {
                  operationId: 'op1',
                  status: 'InProgress',
                  type: 'Indeterminate',
                  description: 'sync.operation.address-discovery',
                  startedAt: Timestamp(Date.now()),
                },
              },
            },
          },
        },
      };

      const progress = selectActiveAccountSyncProgress.resultFunc(
        state.syncStatusByAccount,
        { walletId, accountId: accountId1 },
      );
      expect(progress).toBe(0);
    });

    it('should return progress from the active account only', () => {
      const state: SyncSliceState = {
        syncStatusByAccount: {
          [accountId1]: {
            pendingSync: {
              startedAt: Timestamp(Date.now()),
              operations: {
                op1: {
                  operationId: 'op1',
                  status: 'InProgress',
                  type: 'Determinate',
                  progress: Percent(0.6),
                  description: 'sync.operation.midnight-wallet-sync',
                  startedAt: Timestamp(Date.now()),
                },
              },
            },
          },
          [accountId2]: {
            pendingSync: {
              startedAt: Timestamp(Date.now()),
              operations: {
                op2: {
                  operationId: 'op2',
                  status: 'InProgress',
                  type: 'Determinate',
                  progress: Percent(0.2),
                  description: 'sync.operation.midnight-wallet-sync',
                  startedAt: Timestamp(Date.now()),
                },
              },
            },
          },
        },
      };

      // Only accountId1 is active — should return 0.6, not the average (0.4)
      const progress = selectActiveAccountSyncProgress.resultFunc(
        state.syncStatusByAccount,
        { walletId, accountId: accountId1 },
      );
      expect(progress).toBeCloseTo(0.6, 5);
    });

    it('should cap progress at 0.99 while pendingSync exists', () => {
      const state: SyncSliceState = {
        syncStatusByAccount: {
          [accountId1]: {
            pendingSync: {
              startedAt: Timestamp(Date.now()),
              operations: {
                op1: {
                  operationId: 'op1',
                  status: 'InProgress',
                  type: 'Determinate',
                  progress: Percent(1),
                  description: 'sync.operation.midnight-wallet-sync',
                  startedAt: Timestamp(Date.now()),
                },
              },
            },
          },
        },
      };

      // Progress is 1 but pendingSync still exists — must be capped at 0.99
      const progress = selectActiveAccountSyncProgress.resultFunc(
        state.syncStatusByAccount,
        { walletId, accountId: accountId1 },
      );
      expect(progress).toBe(0.99);
    });

    it('should average multiple determinate operations for the active account', () => {
      const state: SyncSliceState = {
        syncStatusByAccount: {
          [accountId1]: {
            pendingSync: {
              startedAt: Timestamp(Date.now()),
              operations: {
                op1: {
                  operationId: 'op1',
                  status: 'InProgress',
                  type: 'Determinate',
                  progress: Percent(0.4),
                  description: 'sync.operation.midnight-wallet-sync',
                  startedAt: Timestamp(Date.now()),
                },
                op2: {
                  operationId: 'op2',
                  status: 'InProgress',
                  type: 'Determinate',
                  progress: Percent(0.8),
                  description: 'sync.operation.midnight-wallet-sync',
                  startedAt: Timestamp(Date.now()),
                },
              },
            },
          },
        },
      };

      const progress = selectActiveAccountSyncProgress.resultFunc(
        state.syncStatusByAccount,
        { walletId, accountId: accountId1 },
      );
      // Average of 0.4 and 0.8 = 0.6, capped at 0.99
      expect(progress).toBeCloseTo(0.6, 5);
    });

    it('should return 1 when active account is not in syncStatusByAccount', () => {
      const state: SyncSliceState = {
        syncStatusByAccount: {},
      };

      const progress = selectActiveAccountSyncProgress.resultFunc(
        state.syncStatusByAccount,
        { walletId, accountId: accountId1 },
      );
      expect(progress).toBe(1);
    });

    it('should ignore non-active accounts even when they have higher progress', () => {
      const state: SyncSliceState = {
        syncStatusByAccount: {
          [accountId1]: {
            pendingSync: {
              startedAt: Timestamp(Date.now()),
              operations: {
                op1: {
                  operationId: 'op1',
                  status: 'InProgress',
                  type: 'Determinate',
                  progress: Percent(0.1),
                  description: 'sync.operation.midnight-wallet-sync',
                  startedAt: Timestamp(Date.now()),
                },
              },
            },
          },
          [accountId2]: {
            pendingSync: {
              startedAt: Timestamp(Date.now()),
              operations: {
                op2: {
                  operationId: 'op2',
                  status: 'InProgress',
                  type: 'Determinate',
                  progress: Percent(0.9),
                  description: 'sync.operation.midnight-wallet-sync',
                  startedAt: Timestamp(Date.now()),
                },
              },
            },
          },
        },
      };

      // Active is accountId1 at 0.1, not accountId2 at 0.9
      const progress = selectActiveAccountSyncProgress.resultFunc(
        state.syncStatusByAccount,
        { walletId, accountId: accountId1 },
      );
      expect(progress).toBeCloseTo(0.1, 5);
    });
  });

  describe('computeAccountSyncingProgress', () => {
    it('returns undefined when accountStatus is undefined', () => {
      expect(computeAccountSyncingProgress(undefined)).toBeUndefined();
    });

    it('returns undefined when there is no pendingSync', () => {
      expect(
        computeAccountSyncingProgress({
          lastSuccessfulSync: Timestamp(Date.now()),
        }),
      ).toBeUndefined();
    });

    it('returns undefined when all operations are indeterminate', () => {
      expect(
        computeAccountSyncingProgress({
          pendingSync: {
            startedAt: Timestamp(Date.now()),
            operations: {
              op1: {
                operationId: 'op1',
                status: 'InProgress',
                type: 'Indeterminate',
                description: 'sync.operation.address-discovery',
                startedAt: Timestamp(Date.now()),
              },
            },
          },
        }),
      ).toBeUndefined();
    });

    it('returns undefined when all operations are non-InProgress', () => {
      expect(
        computeAccountSyncingProgress({
          pendingSync: {
            startedAt: Timestamp(Date.now()),
            operations: {
              op1: {
                operationId: 'op1',
                status: 'Completed',
                description: 'sync.operation.midnight-wallet-sync',
                startedAt: Timestamp(Date.now()),
                completedAt: Timestamp(Date.now()),
              },
              op2: {
                operationId: 'op2',
                status: 'Failed',
                description: 'sync.operation.midnight-wallet-sync',
                startedAt: Timestamp(Date.now()),
                failedAt: Timestamp(Date.now()),
                error: 'v2.sync-status.error',
              },
            },
          },
        }),
      ).toBeUndefined();
    });

    it('returns progress as a percentage (0–100) for a single determinate operation', () => {
      expect(
        computeAccountSyncingProgress({
          pendingSync: {
            startedAt: Timestamp(Date.now()),
            operations: {
              op1: {
                operationId: 'op1',
                status: 'InProgress',
                type: 'Determinate',
                progress: Percent(0.6),
                description: 'sync.operation.midnight-wallet-sync',
                startedAt: Timestamp(Date.now()),
              },
            },
          },
        }),
      ).toBeCloseTo(60, 5);
    });

    it('returns the average percentage across multiple determinate operations', () => {
      expect(
        computeAccountSyncingProgress({
          pendingSync: {
            startedAt: Timestamp(Date.now()),
            operations: {
              op1: {
                operationId: 'op1',
                status: 'InProgress',
                type: 'Determinate',
                progress: Percent(0.4),
                description: 'sync.operation.midnight-wallet-sync',
                startedAt: Timestamp(Date.now()),
              },
              op2: {
                operationId: 'op2',
                status: 'InProgress',
                type: 'Determinate',
                progress: Percent(0.8),
                description: 'sync.operation.midnight-wallet-sync',
                startedAt: Timestamp(Date.now()),
              },
            },
          },
        }),
      ).toBeCloseTo(60, 5); // (0.4 + 0.8) / 2 * 100
    });

    it('ignores indeterminate operations when averaging', () => {
      expect(
        computeAccountSyncingProgress({
          pendingSync: {
            startedAt: Timestamp(Date.now()),
            operations: {
              op1: {
                operationId: 'op1',
                status: 'InProgress',
                type: 'Indeterminate',
                description: 'sync.operation.address-discovery',
                startedAt: Timestamp(Date.now()),
              },
              op2: {
                operationId: 'op2',
                status: 'InProgress',
                type: 'Determinate',
                progress: Percent(0.5),
                description: 'sync.operation.midnight-wallet-sync',
                startedAt: Timestamp(Date.now()),
              },
            },
          },
        }),
      ).toBeCloseTo(50, 5); // only op2 counted
    });

    it('caps at 99 when progress is 100 but pendingSync still exists', () => {
      // Reproduces the "connected but empty" initial state where computeConnectedSyncRatio
      // returns Percent(1) before isStrictlyComplete is true, leaving pendingSync in place.
      expect(
        computeAccountSyncingProgress({
          pendingSync: {
            startedAt: Timestamp(Date.now()),
            operations: {
              op1: {
                operationId: 'op1',
                status: 'InProgress',
                type: 'Determinate',
                progress: Percent(1),
                description: 'sync.operation.midnight-wallet-sync',
                startedAt: Timestamp(Date.now()),
              },
            },
          },
        }),
      ).toBe(99);
    });
  });
});
