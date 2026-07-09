import { PROVIDER_REQUEST_RETRY_CONFIG } from '@lace-lib/util-provider';
import { Err } from '@lace-sdk/util';
import { retryBackoff } from 'backoff-rxjs';
import {
  catchError,
  concat,
  filter,
  map,
  mergeMap,
  of,
  take,
  toArray,
} from 'rxjs';

import { CardanoPaymentAddress } from '../../types';
import { isCardanoAccount } from '../../util';
import { getScriptAddress } from '../get-script-address';

import { syncAccountStateOperations } from './sync-account-state-operations';
import {
  CardanoSyncOperationType,
  isAddressDiscoveryOperation,
  isThoroughAddressDiscoveryOperation,
  parseTipHashFromOperationId,
} from './sync-operation-utils';

import type {
  CardanoContextAction,
  ActionCreators,
  SideEffect,
} from '../../contract';
import type { CardanoMultiSigAccountProps } from '../../types';
import type { TranslationKey } from '@lace-contract/i18n';
import type { SyncOperationId } from '@lace-contract/sync';
import type {
  AccountId,
  MultiSigWalletAccount,
} from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';

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
 *   2. addSyncOperation(TRANSACTION_POLLING, Pending)  <- this function
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
const chainAccountStateOperations = (params: {
  accountId: AccountId;
  discoveryOperationId: SyncOperationId;
  actions: ActionCreators;
}): CardanoContextAction[] => {
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

/**
 * Handles MultiSig account address discovery by generating script address.
 */
const handleMultiSigAccount = (params: {
  account: MultiSigWalletAccount<CardanoMultiSigAccountProps>;
  accountId: AccountId;
  operationId: SyncOperationId;
  actions: ActionCreators;
}): Observable<CardanoContextAction> => {
  const { account, accountId, operationId, actions } = params;

  const groupedAddress = getScriptAddress(
    account.blockchainSpecific.paymentScript,
    account.blockchainSpecific.stakingScript,
    account.blockchainSpecific.chainId.networkMagic,
  );

  return of(
    actions.sync.updateSyncOperation({
      accountId,
      operationId,
      update: {
        status: 'InProgress',
        type: 'Indeterminate',
      },
    }),
    actions.addresses.upsertAddresses({
      blockchainName: 'Cardano',
      addresses: [
        {
          ...groupedAddress,
          address: CardanoPaymentAddress(groupedAddress.address),
        },
      ],
      accountId,
    }),
    ...chainAccountStateOperations({
      accountId,
      discoveryOperationId: operationId,
      actions,
    }),
    actions.sync.completeSyncOperation({
      accountId,
      operationId,
    }),
  );
};

/**
 * Responds to address discovery sync operations.
 *
 * This side effect:
 * - Watches for pending address-discovery operations
 * - Marks operation as InProgress/Indeterminate
 * - Discovers addresses for the account
 * - Chains account-state sync operations (transaction-polling) with the
 *   round's own tipHash, synchronously with completion
 * - Marks operation as completed or failed
 */
export const addressDiscoverySync: SideEffect = (
  { sync: { addSyncOperation$ } },
  { wallets: { selectActiveNetworkAccounts$ } },
  { actions, cardanoProvider: { discoverAddresses } },
) =>
  addSyncOperation$.pipe(
    filter(
      action =>
        action.payload.operation.status === 'Pending' &&
        isAddressDiscoveryOperation(action.payload.operation.operationId),
    ),
    mergeMap(action => {
      const { accountId, operation } = action.payload;
      const operationId = operation.operationId;

      return selectActiveNetworkAccounts$.pipe(
        take(1), // Take current value only, prevent re-subscription on state changes
        map(accounts =>
          accounts
            .filter(isCardanoAccount)
            .find(account => account.accountId === accountId),
        ),
        filter((account): account is NonNullable<typeof account> => !!account),
        mergeMap((account): Observable<CardanoContextAction> => {
          // Handle MultiSig accounts
          if (account.accountType === 'MultiSig') {
            return handleMultiSigAccount({
              account,
              accountId,
              operationId,
              actions,
            });
          }

          // Mark operation as InProgress for regular accounts
          const markInProgress = actions.sync.updateSyncOperation({
            accountId,
            operationId,
            update: {
              status: 'InProgress',
              type: 'Indeterminate',
            },
          });

          // Regular account discovery
          const isThorough = isThoroughAddressDiscoveryOperation(operationId);
          return concat(
            of(markInProgress),
            discoverAddresses(
              {
                accountIndex: account.blockchainSpecific.accountIndex,
                xpub: account.blockchainSpecific.extendedAccountPublicKey,
                thorough: isThorough,
              },
              { chainId: account.blockchainSpecific.chainId },
            ).pipe(
              // Convert Err results to thrown errors for retryBackoff
              map(result => {
                if (result.isErr()) {
                  throw result.error;
                }
                return result;
              }),
              retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
              // After retries exhausted, convert thrown error back to Err result
              catchError(error => of(Err(error))),
              // createTrackAccountTransactionHistory depends on discovery being completed at least once before it fetches
              // transactions - that is to avoid gaps in local tx history when we have partial addresses list.
              toArray(),
              mergeMap(discoverAddressesResults => {
                const anyFailure = discoverAddressesResults.find(
                  r => r.isErr() && r.error,
                );
                if (anyFailure) {
                  return [
                    actions.sync.failSyncOperation({
                      accountId,
                      operationId,
                      error:
                        'sync.error.address-discovery-failed' as TranslationKey,
                    }),
                  ];
                }
                const addresses = discoverAddressesResults.map(result =>
                  result.unwrap(),
                );
                return [
                  actions.addresses.upsertAddresses({
                    blockchainName: 'Cardano',
                    accountId: account.accountId,
                    addresses,
                  }),
                  ...chainAccountStateOperations({
                    accountId,
                    discoveryOperationId: operationId,
                    actions,
                  }),
                  actions.sync.completeSyncOperation({
                    accountId,
                    operationId,
                  }),
                ];
              }),
            ),
          );
        }),
      );
    }),
  );
