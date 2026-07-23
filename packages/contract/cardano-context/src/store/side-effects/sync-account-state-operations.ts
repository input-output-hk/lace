import { Timestamp } from '@lace-lib/util';

import {
  CardanoSyncOperationType,
  createSyncOperationId,
} from './sync-operation-utils';

import type { TranslationKey } from '@lace-contract/i18n';
import type { SyncOperation } from '@lace-contract/sync';
import type { AccountId } from '@lace-contract/wallet-repo';

/**
 * Builds the list of sync operations that fetch account state for a sync round,
 * once addresses have been discovered. Single source of truth for the operations
 * chained after address discovery. Used by:
 * - coordinate-sync: seeds the round for accounts that already have addresses
 * - sync-account-state-after-address-discovery: appends to the in-flight round
 *   right after discovery emits addresses, keeping everything in one round
 */
export const syncAccountStateOperations = (params: {
  accountId: AccountId;
  tipHash: string | undefined;
}): SyncOperation[] => {
  const { accountId, tipHash } = params;
  const now = Timestamp(Date.now());
  return [
    {
      operationId: createSyncOperationId(
        accountId,
        tipHash,
        CardanoSyncOperationType.TRANSACTION_POLLING,
      ),
      status: 'Pending',
      description: 'sync.operation.transaction-polling' as TranslationKey,
      startedAt: now,
    },
  ];
};
