import type { Percent } from '@cardano-sdk/util';
import type { TranslationKey } from '@lace-contract/i18n';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { Timestamp } from '@lace-sdk/util';

export type SyncOperationId = string;

export type SyncOperationType = 'Determinate' | 'Indeterminate';

export type SyncOperationStatus =
  | 'Completed'
  | 'Failed'
  | 'InProgress'
  | 'Pending';

export type SyncOperationBase = {
  operationId: SyncOperationId;
  description: TranslationKey;
  startedAt: Timestamp;
};

export type SyncOperationPending = SyncOperationBase & {
  status: 'Pending';
};

export type SyncOperationInProgressDeterminate = SyncOperationBase & {
  status: 'InProgress';
  type: 'Determinate';
  progress: Percent;
};

export type SyncOperationInProgressIndeterminate = SyncOperationBase & {
  status: 'InProgress';
  type: 'Indeterminate';
};

export type SyncOperationInProgress =
  | SyncOperationInProgressDeterminate
  | SyncOperationInProgressIndeterminate;

export type SyncOperationCompleted = SyncOperationBase & {
  status: 'Completed';
  completedAt: Timestamp;
};

export type SyncOperationFailed = SyncOperationBase & {
  status: 'Failed';
  failedAt: Timestamp;
  error: TranslationKey;
};

export type PendingSync = {
  startedAt: Timestamp;
  operations: Record<SyncOperationId, SyncOperation>;
};

// Discriminated union for sync operations
export type SyncOperation =
  | SyncOperationCompleted
  | SyncOperationFailed
  | SyncOperationInProgress
  | SyncOperationPending;

export type AccountSyncStatus = {
  lastSuccessfulSync?: Timestamp;
  pendingSync?: PendingSync;
};

export type SyncSliceState = {
  syncStatusByAccount: Record<AccountId, AccountSyncStatus>;
};

// For UI consumption - derived status
export type GlobalSyncStatus = 'error' | 'idle' | 'synced' | 'syncing';
