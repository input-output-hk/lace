import { ACTIVITIES_PER_PAGE } from '@lace-contract/activities';
import { AccountId } from '@lace-contract/wallet-repo';
import unionBy from 'lodash/unionBy';
import {
  concatMap,
  EMPTY,
  from,
  interval,
  map,
  mergeMap,
  of,
  concat,
  catchError,
  withLatestFrom,
  switchMap,
  filter,
  combineLatest,
} from 'rxjs';

import { getAccountAddresses } from '../helpers';

import type {
  Action,
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
import type { Milliseconds } from '@lace-sdk/util';
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
    { addresses, cardanoContext },
    { actions, cardanoProvider: { getAddressTransactionHistory }, logger },
  ) =>
    sourceObservable.pipe(
      withLatestFrom(
        addresses.selectAllAddresses$,
        cardanoContext.selectAccountTransactionHistory$,
        cardanoContext.selectChainId$.pipe(filter(Boolean)),
      ),
      // Process emissions sequentially. concatMap queues instead of dropping,
      // so all accounts emitted synchronously by getPollTransactionsObservable
      // are processed (exhaustMap would only process the first and drop the rest).
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

          const fetchObservable = fetchAddressTransactionHistories({
            addresses: accountAddresses,
            addressesHistories: accountAddressesHistories,
            chainId,
            numberOfItems,
            getAddressTransactionHistory,
          }).pipe(
            mergeMap(result =>
              from(
                result.mapOrElse<Action[]>(
                  errorDetails => [
                    actions.cardanoContext.getAddressTransactionHistoryFailed({
                      accountId,
                      address: errorDetails.address,
                      failure: errorDetails.error.reason,
                    }),
                  ],
                  addressHistories => [
                    actions.cardanoContext.setAccountTransactionHistory({
                      accountId,
                      addressHistories,
                    }),
                    ...(addressHistories.every(
                      history => history.hasLoadedOldestEntry,
                    )
                      ? [
                          actions.activities.setHasLoadedOldestEntry({
                            accountId,
                            hasLoadedOldestEntry: true,
                          }),
                        ]
                      : []),
                  ],
                ),
              ),
            ),
            catchError(error => {
              logger.error(
                'Failed to fetch address transaction histories',
                error,
              );
              return EMPTY;
            }),
          );

          return concat(
            fetchObservable,
            of(actions.activities.pollNewerAccountsActivities()),
          );
        },
      ),
    );

export const getLoadOlderActivitiesObservable = (
  activities: StateObservables<Selectors>['activities'],
  cardanoContext: StateObservables<Selectors>['cardanoContext'],
  sync: StateObservables<Selectors>['sync'],
) =>
  from(
    // Re-trigger whenever the desired amount or any account sync status changes
    combineLatest([
      activities.selectDesiredLoadedActivitiesCountPerAccount$,
      sync.selectSyncStatusByAccount$,
    ]),
  )
    .pipe(
      mergeMap(
        ([desiredLoadedActivitiesCountPerAccount, syncStatusByAccount]) =>
          from(
            Object.entries(desiredLoadedActivitiesCountPerAccount).map<
              [AccountId, number, AccountSyncStatus]
            >(([accountId, desiredActivities]) => [
              AccountId(accountId),
              desiredActivities,
              syncStatusByAccount[AccountId(accountId)],
            ]),
          ),
      ),
    )
    .pipe(
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
          (allActivities[accountId]?.length ?? 0) <
            desiredLoadedActivitiesCount,
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

export const getPollTransactionsObservable = (
  actionObservables: ActionObservables<ActionCreators>,
  addresses: StateObservables<Selectors>['addresses'],
  pollingIntervalSeconds: Milliseconds,
) =>
  from(actionObservables.activities.pollNewerAccountsActivities$).pipe(
    switchMap(() =>
      interval(pollingIntervalSeconds).pipe(
        withLatestFrom(addresses.selectAllAddresses$),
        filter(([_, addresses]) => addresses.length > 0),
        map(([_, addresses]) =>
          unionBy(addresses, address => address.accountId),
        ),
        mergeMap(addresses => from(addresses)),
        map(address => ({
          payload: {
            accountId: address.accountId,
            numberOfItems: ACTIVITIES_PER_PAGE,
          },
        })),
      ),
    ),
  );
