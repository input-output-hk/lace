import {
  CardanoSyncOperationType,
  isThoroughAddressDiscoveryOperation,
  parseTipHashFromOperationId,
  syncAccountStateOperations,
} from '@lace-contract/cardano-context';

import type { ActionCreators, CardanoSyncAction } from '../../module';
import type { SyncOperationId } from '@lace-contract/sync';
import type { AccountId } from '@lace-contract/wallet-repo';

/**
 * Builds the `addSyncOperation` actions that chain account-state operations
 * (currently transaction-polling) after a successful address discovery. The
 * chained operationIds reuse the discovery's tipHash so every op in the round
 * shares the same `${accountId}-${tipHash}` prefix, and are dispatched
 * synchronously with `upsertAddresses` / `completeSyncOperation(discovery)` so
 * `pendingSync` is never transiently empty between rounds (no "synced ✓"
 * flash).
 *
 * Dispatch order invariant (callers MUST emit in this sequence):
 *   1. upsertAddresses
 *   2. addSyncOperation(TRANSACTION_POLLING, Pending)  ← this function
 *   3. completeSyncOperation(ADDRESS_DISCOVERY)
 *
 * Why the order matters: coordinateCardanoSync only tracks the
 * ADDRESS_DISCOVERY operationId in its waitForCompletion$ for first-time
 * sync rounds (no addresses yet). The chained TXP op is intentionally NOT
 * tracked there. Step 1 causes naturalTrigger$ (combineLatest over
 * accounts/addresses/tip/chainId) to emit while ADDRESS_DISCOVERY is still
 * pending, so exhaustMap drops that emission instead of starting a duplicate
 * round. Step 2 enqueues the TXP op while the round is still locked. Step 3
 * releases the lock, by which point any natural-trigger emission caused by
 * upsertAddresses has already been dropped. If steps were reordered
 * (e.g. complete discovery before chaining TXP), exhaustMap would unlock
 * first and the next combineLatest emission would start a second round that
 * dispatches a duplicate addSyncOperation(TXP) with the same operationId.
 */
export const chainAccountStateOperations = (params: {
  accountId: AccountId;
  discoveryOperationId: SyncOperationId;
  actions: ActionCreators;
}): CardanoSyncAction[] => {
  const { accountId, discoveryOperationId, actions } = params;
  // The operation type must match the actual suffix length, otherwise
  // parseTipHashFromOperationId slices at the wrong offset and the chained
  // transaction-polling op gets a malformed tipHash.
  const operationType = isThoroughAddressDiscoveryOperation(
    discoveryOperationId,
  )
    ? CardanoSyncOperationType.ADDRESS_DISCOVERY_THOROUGH
    : CardanoSyncOperationType.ADDRESS_DISCOVERY;
  const tipHash = parseTipHashFromOperationId({
    operationId: discoveryOperationId,
    accountId,
    operationType,
  });
  return syncAccountStateOperations({ accountId, tipHash }).map(operation =>
    actions.sync.addSyncOperation({ accountId, operation }),
  );
};
