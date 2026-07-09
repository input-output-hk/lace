import { ActivitiesPaginationFailureId } from '@lace-contract/activities';
import { autoDismissFailureOnSuccess } from '@lace-contract/failures';
import { AccountId } from '@lace-contract/wallet-repo';
import { PROVIDER_REQUEST_RETRY_CONFIG } from '@lace-lib/util-provider';
import { retryBackoff } from 'backoff-rxjs';
import {
  EMPTY,
  concat,
  concatMap,
  from,
  map,
  merge,
  mergeMap,
  of,
  catchError,
  withLatestFrom,
  filter,
  combineLatest,
} from 'rxjs';

import { getAccountAddresses } from '../helpers';

const hasLoadedOldestEntry = (history: {
  hasLoadedOldestEntry: boolean;
}): boolean => history.hasLoadedOldestEntry;

import type {
  CardanoContextAction,
  ActionCreators,
  Selectors,
  SideEffect,
} from '../../contract';
import type {
  FetchAddressTransactionHistoriesParams,
  FetchAddressTransactionHistoriesResponse,
} from '../helpers/fetch-address-transaction-histories';
import type {
  ActionObservables,
  StateObservables,
} from '@lace-contract/module';
import type { AccountSyncStatus } from '@lace-contract/sync';
import type { Observable } from 'rxjs';

export const createTrackAccountTransactionHistory =
  (
    fetchAddressTransactionHistories: (
      params: FetchAddressTransactionHistoriesParams,
    ) => FetchAddressTransactionHistoriesResponse,
    sourceObservable: Observable<{
      payload: {
        accountId: AccountId;
        numberOfItems: number;
      };
    }>,
  ): SideEffect =>
  (
    _,
    { addresses, cardanoContext, failures: { selectFailureById$ } },
    { actions, cardanoProvider: { getAddressTransactionHistory } },
  ) =>
    sourceObservable.pipe(
      withLatestFrom(
        addresses.selectAllAddresses$,
        cardanoContext.selectAccountTransactionHistory$,
        cardanoContext.selectChainId$.pipe(filter(Boolean)),
      ),
      // Uses concatMap to ensure all accounts are polled sequentially without dropping any.
      concatMap(
        ([
          {
            payload: { accountId, numberOfItems },
          },
          addresses,
          allAccountsAddressesHistories,
          chainId,
        ]) => {
          const accountAddresses = getAccountAddresses(
            addresses,
            accountId,
            chainId,
          );
          if (accountAddresses.length === 0) return EMPTY;

          const accountAddressesHistories =
            allAccountsAddressesHistories[accountId] ?? {};
          const failureId = ActivitiesPaginationFailureId(accountId);

          return fetchAddressTransactionHistories({
            addresses: accountAddresses,
            addressesHistories: accountAddressesHistories,
            chainId,
            numberOfItems,
            getAddressTransactionHistory,
          }).pipe(
            map(result => {
              if (result.isErr()) throw result.unwrapErr().error;
              return result.unwrap();
            }),
            retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
            mergeMap(addressHistories =>
              concat(
                from<CardanoContextAction[]>([
                  actions.cardanoContext.setAccountTransactionHistory({
                    accountId,
                    addressHistories,
                  }),
                  ...(addressHistories.every(hasLoadedOldestEntry)
                    ? [
                        actions.activities.setHasLoadedOldestEntry({
                          accountId,
                          hasLoadedOldestEntry: true,
                        }),
                      ]
                    : []),
                ]),
                of(failureId).pipe(
                  autoDismissFailureOnSuccess(selectFailureById$),
                ),
              ),
            ),
            catchError(() =>
              of(
                actions.failures.addFailure({
                  failureId,
                  message: 'activities.error.pagination-failed',
                  retryAction: actions.activities.retryPagination({
                    accountId,
                  }),
                }),
              ),
            ),
          );
        },
      ),
    );

export const getLoadOlderActivitiesObservable = ({
  actionObservables,
  activities,
  cardanoContext,
  sync,
}: {
  actionObservables: ActionObservables<ActionCreators>;
  activities: StateObservables<Selectors>['activities'];
  cardanoContext: StateObservables<Selectors>['cardanoContext'];
  sync: StateObservables<Selectors>['sync'];
}) => {
  type AccountTrigger = [AccountId, number, AccountSyncStatus];

  const stateTriggered$ = combineLatest([
    activities.selectDesiredLoadedActivitiesCountPerAccount$,
    sync.selectSyncStatusByAccount$,
  ]).pipe(
    mergeMap(([desiredLoadedActivitiesCountPerAccount, syncStatusByAccount]) =>
      from(
        Object.entries(
          desiredLoadedActivitiesCountPerAccount,
        ).map<AccountTrigger>(([accountId, desiredActivities]) => [
          AccountId(accountId),
          desiredActivities,
          syncStatusByAccount[AccountId(accountId)],
        ]),
      ),
    ),
  );

  // Manual retry after pagination failure: selectors are ref-equal after a
  // failed fetch (desired > loaded guard keeps state unchanged), so we
  // re-emit an explicit trigger for the target account.
  const manualRetryTriggered$ =
    actionObservables.activities.retryPagination$.pipe(
      withLatestFrom(
        activities.selectDesiredLoadedActivitiesCountPerAccount$,
        sync.selectSyncStatusByAccount$,
      ),
      map(
        ([
          {
            payload: { accountId },
          },
          desiredLoadedActivitiesCountPerAccount,
          syncStatusByAccount,
        ]): AccountTrigger => [
          accountId,
          desiredLoadedActivitiesCountPerAccount[accountId] ?? 0,
          syncStatusByAccount[accountId],
        ],
      ),
    );

  return merge(stateTriggered$, manualRetryTriggered$).pipe(
    withLatestFrom(
      cardanoContext.selectCombinedTransactionHistory$,
      activities.selectAllMap$,
    ),
    filter(
      ([
        [accountId, desiredLoadedActivitiesCount, accountSyncStatus],
        combinedTransactionHistory,
        allActivities,
      ]) =>
        // Make sure the account has synced at least once
        !!accountSyncStatus?.lastSuccessfulSync &&
        // Only continue if we are missing activity history items
        (combinedTransactionHistory[accountId]?.length ?? 0) <
          desiredLoadedActivitiesCount &&
        // Only continue if we don't have enough activities loaded yet
        (allActivities[accountId]?.length ?? 0) < desiredLoadedActivitiesCount,
    ),
    map(
      ([
        [accountId, desiredLoadedActivitiesCount],
        combinedTransactionHistory,
      ]) => ({
        payload: {
          accountId: AccountId(accountId),
          numberOfItems:
            desiredLoadedActivitiesCount -
            (combinedTransactionHistory[AccountId(accountId)]?.length ?? 0),
        },
      }),
    ),
  );
};
