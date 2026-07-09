import { ACTIVITIES_PER_PAGE } from '@lace-contract/activities';
import {
  catchError,
  concat,
  EMPTY,
  filter,
  map,
  mergeMap,
  of,
  withLatestFrom,
} from 'rxjs';

import { isCardanoAccount } from '../../util';
import { fetchNewAddressTransactionHistories } from '../helpers/fetch-address-transaction-histories';
import { getAccountAddresses } from '../helpers/group-cardano-addresses-by-account';

import { isTransactionPollingOperation } from './sync-operation-utils';

import type { CardanoContextAction, SideEffect } from '../../contract';
import type { TranslationKey } from '@lace-contract/i18n';
import type { Observable } from 'rxjs';

/**
 * Responds to transaction polling sync operations.
 *
 * This side effect:
 * - Watches for pending transaction-polling operations
 * - Marks operation as InProgress/Indeterminate
 * - Fetches newer transactions for all Cardano addresses of the account
 * - Marks operation as completed or failed
 *
 * Transient provider errors are retried with exponential backoff. On exhaustion,
 * the sync operation is failed — `trackSyncRoundFailures` handles user-facing
 * failure tracking and auto-dismissal.
 */
export const transactionPollingSync: SideEffect = (
  { sync: { addSyncOperation$ } },
  {
    wallets: { selectActiveNetworkAccounts$ },
    addresses: { selectAllAddresses$ },
    cardanoContext: { selectAccountTransactionHistory$ },
  },
  { actions, cardanoProvider: { getAddressTransactionHistory } },
) =>
  addSyncOperation$.pipe(
    filter(
      action =>
        action.payload.operation.status === 'Pending' &&
        isTransactionPollingOperation(action.payload.operation.operationId),
    ),
    withLatestFrom(
      selectActiveNetworkAccounts$,
      selectAllAddresses$,
      selectAccountTransactionHistory$,
    ),
    mergeMap(
      ([
        action,
        allAccounts,
        allAddresses,
        accountsHistories,
      ]): Observable<CardanoContextAction> => {
        const { accountId, operation } = action.payload;
        const operationId = operation.operationId;

        const account = allAccounts
          .filter(isCardanoAccount)
          .find(a => a.accountId === accountId);
        if (!account) return EMPTY;

        const chainId = account.blockchainSpecific.chainId;
        const accountAddresses = getAccountAddresses(
          allAddresses,
          accountId,
          chainId,
        );

        if (accountAddresses.length === 0) {
          // Nothing to fetch — skip the redundant InProgress transition and
          // go straight to Completed so the round can close.
          return of(
            actions.sync.completeSyncOperation({ accountId, operationId }),
          );
        }

        const markInProgress = actions.sync.updateSyncOperation({
          accountId,
          operationId,
          update: { status: 'InProgress', type: 'Indeterminate' },
        });

        const addressesHistories = accountsHistories[accountId] ?? {};

        const fetch$ = fetchNewAddressTransactionHistories({
          addresses: accountAddresses,
          addressesHistories,
          chainId,
          numberOfItems: ACTIVITIES_PER_PAGE,
          getAddressTransactionHistory,
        }).pipe(
          map(result => {
            if (result.isErr()) throw result.unwrapErr().error;
            return result.unwrap();
          }),
        );

        return concat(
          of(markInProgress),
          fetch$.pipe(
            mergeMap(addressHistories => [
              actions.cardanoContext.setAccountTransactionHistory({
                accountId,
                addressHistories,
              }),
              actions.sync.completeSyncOperation({
                accountId,
                operationId,
              }),
            ]),
            catchError(() =>
              of(
                actions.sync.failSyncOperation({
                  accountId,
                  operationId,
                  error:
                    'sync.error.transaction-polling-failed' as TranslationKey,
                }),
              ),
            ),
          ),
        );
      },
    ),
  );
