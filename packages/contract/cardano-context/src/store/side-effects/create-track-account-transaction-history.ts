import { ACTIVITIES_PER_PAGE } from '@lace-contract/activities';
import { AccountId } from '@lace-contract/wallet-repo';
import {
  EMPTY,
  concatMap,
  from,
  map,
  mergeMap,
  catchError,
  withLatestFrom,
  filter,
  combineLatest,
  pairwise,
  startWith,
} from 'rxjs';

import { getAccountAddresses } from '../helpers';
import {
  prepareCardanoAccountsData,
  type AccountMetadata,
} from '../helpers/prepareCardanoAccountsData';

import type { Action, Selectors, SideEffect } from '../../contract';
import type {
  FetchAddressTransactionHistoriesParams,
  FetchAddressTransactionHistoriesResponse,
} from '../helpers/fetch-address-transaction-histories';
import type { StateObservables } from '@lace-contract/module';
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
    { addresses, cardanoContext },
    { actions, cardanoProvider: { getAddressTransactionHistory }, logger },
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

          return fetchAddressTransactionHistories({
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

/**
 * Creates an observable that emits when newer transactions should be fetched.
 *
 * Triggers reactively whenever `accountTransactionsTotal` increases for an
 * account (new transaction detected) or when a new account is discovered.
 * This is more efficient than blind time-based polling because it only fetches
 * when there's actually a change detected, similar to how UTXOs are tracked.
 */
export const getPollTransactionsObservable = (
  stateObservables: StateObservables<Selectors>,
) =>
  prepareCardanoAccountsData(stateObservables).pipe(
    startWith([] as AccountMetadata[]),
    pairwise(),
    mergeMap(([previousAccounts, currentAccounts]) => {
      const items = currentAccounts.flatMap(current => {
        const previous = previousAccounts.find(
          p => p.accountId === current.accountId,
        );
        // Initial observation of the account — fetch a single page of newest
        // txs. Older pages are loaded on demand by getLoadOlderActivitiesObservable.
        if (!previous) {
          return [
            {
              accountId: current.accountId,
              numberOfItems: ACTIVITIES_PER_PAGE,
            },
          ];
        }
        const delta = current.total - previous.total;
        if (delta <= 0) return [];
        // Ask for at least a page, but enough to cover the delta so we don't
        // leave a gap when many txs arrive between tip polls.
        return [
          {
            accountId: current.accountId,
            numberOfItems: Math.max(ACTIVITIES_PER_PAGE, delta),
          },
        ];
      });
      return from(items);
    }),
    map(({ accountId, numberOfItems }) => ({
      payload: { accountId, numberOfItems },
    })),
  );
