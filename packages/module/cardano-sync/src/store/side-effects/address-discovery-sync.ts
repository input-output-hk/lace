import {
  toContractAddress,
  isAddressDiscoveryOperation,
  isCardanoAccount,
  isThoroughAddressDiscoveryOperation,
} from '@lace-contract/cardano-context';
import { Err } from '@lace-lib/util';
import { PROVIDER_REQUEST_RETRY_CONFIG } from '@lace-lib/util-provider';
import { retryBackoff } from 'backoff-rxjs';
import {
  catchError,
  concat,
  filter,
  map,
  mergeMap,
  of,
  take,
  takeUntil,
  toArray,
} from 'rxjs';

import { getScriptAddress } from '../get-script-address';

import {
  extensionAccountAddressDiscovery,
  isExtensionAccount,
} from './account-extensions';
import { chainAccountStateOperations } from './chain-account-state-operations';

import type {
  ActionCreators,
  CardanoSyncAction,
  SideEffect,
} from '../../module';
import type { CardanoMultiSigAccountProps } from '@lace-contract/cardano-context';
import type { TranslationKey } from '@lace-contract/i18n';
import type { SyncOperationId } from '@lace-contract/sync';
import type {
  AccountId,
  MultiSigWalletAccount,
} from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';

/**
 * Handles MultiSig account address discovery by generating script address.
 */
const handleMultiSigAccount = (params: {
  account: MultiSigWalletAccount<CardanoMultiSigAccountProps>;
  accountId: AccountId;
  operationId: SyncOperationId;
  actions: ActionCreators;
}): Observable<CardanoSyncAction> => {
  const { account, accountId, operationId, actions } = params;

  const groupedAddress = getScriptAddress(
    account.blockchainSpecific.paymentScript,
    account.blockchainSpecific.stakingScript,
    account.blockchainSpecific.chainId.networkId,
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
        toContractAddress(
          groupedAddress,
          account.blockchainSpecific.chainId.networkMagic,
        ),
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
  {
    sync: {
      addSyncOperation$,
      failSyncOperation$,
      clearPendingSyncsForAccounts$,
    },
  },
  { wallets: { selectActiveNetworkAccounts$ } },
  { actions, cardanoProvider: { discoverAddresses }, logger },
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

      // Cancel the in-flight discovery once the account leaves the active
      // network (network switch / account removal). Address discovery is the
      // sustained-CPU op (bip32-ed25519 derivation, worst in `thorough` scans),
      // so without this teardown a switch mid-scan keeps deriving the previous
      // network's addresses to completion. `clearStaleCardanoSyncsOnNetworkChange`
      // only frees the redux round lock — it does not stop the running executor.
      const accountLeftActiveNetwork$ = selectActiveNetworkAccounts$.pipe(
        filter(accounts => !accounts.some(a => a.accountId === accountId)),
        take(1),
      );

      return selectActiveNetworkAccounts$.pipe(
        take(1), // Take current value only, prevent re-subscription on state changes
        map(accounts =>
          accounts
            .filter(isCardanoAccount)
            .find(account => account.accountId === accountId),
        ),
        filter((account): account is NonNullable<typeof account> => !!account),
        mergeMap((account): Observable<CardanoSyncAction> => {
          // Handle MultiSig accounts
          if (account.accountType === 'MultiSig') {
            return handleMultiSigAccount({
              account,
              accountId,
              operationId,
              actions,
            });
          }

          if (isExtensionAccount(account)) {
            return extensionAccountAddressDiscovery({
              account,
              accountId,
              operationId,
              actions,
              logger,
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
                if (anyFailure?.isErr()) {
                  logger.error(
                    `Address discovery failed for account ${accountId}`,
                    anyFailure.error,
                  );
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
        takeUntil(accountLeftActiveNetwork$),
        takeUntil(
          clearPendingSyncsForAccounts$.pipe(
            filter(a => a.payload.accountIds.includes(accountId)),
          ),
        ),
        takeUntil(
          failSyncOperation$.pipe(
            filter(a => a.payload.operationId === operationId),
          ),
        ),
      );
    }),
  );
