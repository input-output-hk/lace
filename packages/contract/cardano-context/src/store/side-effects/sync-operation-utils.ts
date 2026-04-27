import type { SyncOperationId } from '@lace-contract/sync';
import type { AccountId } from '@lace-contract/wallet-repo';

/**
 * Cardano-specific sync operation types.
 */
export enum CardanoSyncOperationType {
  ADDRESS_DISCOVERY = 'address-discovery',
}

/**
 * Creates a sync operation ID for a Cardano account.
 *
 * Format: `${accountId}-${tipHash}-${operationType}`
 *
 * @param accountId - The account ID
 * @param tipHash - The blockchain tip hash (or undefined for "no-tip")
 * @param operationType - The type of sync operation
 * @returns The sync operation ID
 */
export const createSyncOperationId = (
  accountId: AccountId,
  tipHash: string | undefined,
  operationType: CardanoSyncOperationType,
): SyncOperationId => {
  const syncRoundId = `${accountId}-${tipHash || 'no-tip'}`;
  return `${syncRoundId}-${operationType}`;
};

/**
 * Checks if an operation ID is for address discovery.
 *
 * @param operationId - The operation ID to check
 * @returns True if the operation is address discovery
 */
export const isAddressDiscoveryOperation = (
  operationId: SyncOperationId,
): boolean => {
  return operationId.endsWith(`-${CardanoSyncOperationType.ADDRESS_DISCOVERY}`);
};
