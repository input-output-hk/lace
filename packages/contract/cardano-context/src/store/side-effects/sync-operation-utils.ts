import type { SyncOperationId } from '@lace-contract/sync';
import type { AccountId } from '@lace-contract/wallet-repo';

const NO_TIP = 'no-tip';

/**
 * Cardano-specific sync operation types.
 */
export enum CardanoSyncOperationType {
  ADDRESS_DISCOVERY = 'address-discovery',
  ADDRESS_DISCOVERY_THOROUGH = 'address-discovery-thorough',
  TRANSACTION_POLLING = 'transaction-polling',
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
  const syncRoundId = `${accountId}-${tipHash || NO_TIP}`;
  return `${syncRoundId}-${operationType}`;
};

/**
 * Extracts the tip hash from a Cardano sync operation ID.
 *
 * Inverse of `createSyncOperationId`. Returns `undefined` when the op was
 * created without a tip (`no-tip` placeholder).
 */
export const parseTipHashFromOperationId = (params: {
  operationId: SyncOperationId;
  accountId: AccountId;
  operationType: CardanoSyncOperationType;
}): string | undefined => {
  const { operationId, accountId, operationType } = params;
  const tipHashOrNoTip = operationId.slice(
    `${accountId}-`.length,
    operationId.length - `-${operationType}`.length,
  );
  return tipHashOrNoTip === NO_TIP ? undefined : tipHashOrNoTip;
};

/**
 * Checks if an operation ID is for address discovery (standard or thorough).
 *
 * @param operationId - The operation ID to check
 * @returns True if the operation is address discovery
 */
export const isAddressDiscoveryOperation = (
  operationId: SyncOperationId,
): boolean =>
  operationId.endsWith(`-${CardanoSyncOperationType.ADDRESS_DISCOVERY}`) ||
  operationId.endsWith(
    `-${CardanoSyncOperationType.ADDRESS_DISCOVERY_THOROUGH}`,
  );

/**
 * Checks if an operation ID is for thorough (user-triggered) address
 * discovery. Returns false for standard automatic address discovery.
 *
 * @param operationId - The operation ID to check
 * @returns True if the operation is thorough address discovery
 */
export const isThoroughAddressDiscoveryOperation = (
  operationId: SyncOperationId,
): boolean =>
  operationId.endsWith(
    `-${CardanoSyncOperationType.ADDRESS_DISCOVERY_THOROUGH}`,
  );

/**
 * Checks if an operation ID is for transaction polling.
 *
 * @param operationId - The operation ID to check
 * @returns True if the operation is transaction polling
 */
export const isTransactionPollingOperation = (
  operationId: SyncOperationId,
): boolean => {
  return operationId.endsWith(
    `-${CardanoSyncOperationType.TRANSACTION_POLLING}`,
  );
};
