import { Timestamp } from '@lace-lib/util';
import {
  EMPTY,
  catchError,
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  mergeMap,
  scan,
  switchMap,
  takeUntil,
} from 'rxjs';

import { FEATURE_FLAG_MIDNIGHT_SHIELDED_ACTIVITY_ROWS } from '../../const';
import {
  deriveUnshieldedActivity,
  entryHasUnshieldedActivity,
  formatFee,
  getAddressFromUtxos,
} from '../utils/activities';

import type { SideEffect } from '../..';
import type { Activity, ActivityDetail } from '@lace-contract/activities';
import type {
  MidnightSDKNetworkId,
  MidnightWallet,
  MidnightWalletsByAccountId,
} from '@lace-contract/midnight-context';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { WalletEntry } from '@midnightntwrk/wallet-sdk';
import type { Observable } from 'rxjs';

export const mapTxHistoryEntryToActivity = ({
  accountId,
  txHistoryEntry,
  networkId,
}: {
  accountId: AccountId;
  txHistoryEntry: WalletEntry;
  networkId: MidnightSDKNetworkId;
}): Activity => {
  const { hash, timestamp, status } = txHistoryEntry;
  const createdUtxos = txHistoryEntry.unshielded?.createdUtxos ?? [];
  const spentUtxos = txHistoryEntry.unshielded?.spentUtxos ?? [];
  const { type, tokenBalanceChanges } = deriveUnshieldedActivity({
    status,
    createdUtxos,
    spentUtxos,
    networkId,
  });
  return {
    accountId,
    activityId: hash,
    type,
    timestamp: Timestamp(timestamp?.getTime() ?? 0),
    tokenBalanceChanges,
  };
};

const mapTxHistoryEntryToActivityDetail = ({
  accountId,
  txHistoryEntry,
  networkId,
}: {
  accountId: AccountId;
  txHistoryEntry: WalletEntry;
  networkId: MidnightSDKNetworkId;
}): ActivityDetail => {
  const createdUtxos = txHistoryEntry.unshielded?.createdUtxos ?? [];
  const spentUtxos = txHistoryEntry.unshielded?.spentUtxos ?? [];
  const activity = mapTxHistoryEntryToActivity({
    accountId,
    txHistoryEntry,
    networkId,
  });
  const address = getAddressFromUtxos(createdUtxos, spentUtxos);
  return {
    ...activity,
    address,
    fee: formatFee(txHistoryEntry.fees),
  };
};

type WalletsDiff = {
  current: MidnightWalletsByAccountId;
  added: MidnightWallet[];
};

/**
 * Whether confirmed rows with no unshielded section are shown. They carry no
 * readable value or date, so they render as amount-less "unknown" / 1970 rows;
 * hiding them is the default and the flag restores the earlier behaviour while
 * the product decision is open.
 */
const showShieldedOnlyRows$ = (
  stateObservables: Parameters<SideEffect>[1],
): Observable<boolean> =>
  stateObservables.features.selectLoadedFeatures$.pipe(
    map(loaded =>
      loaded.featureFlags.some(
        flag => flag.key === FEATURE_FLAG_MIDNIGHT_SHIELDED_ACTIVITY_ROWS,
      ),
    ),
    distinctUntilChanged(),
  );

export const updateActivities: SideEffect = (
  _,
  stateObservables,
  { actions, midnightWallets$ },
) =>
  midnightWallets$.pipe(
    scan<MidnightWalletsByAccountId, WalletsDiff>(
      (accumulator, wallets) => ({
        current: wallets,
        added: Object.values(wallets).filter(
          w => !(w.accountId in accumulator.current),
        ),
      }),
      { current: {}, added: [] },
    ),
    mergeMap(({ added }) => added),
    mergeMap(wallet =>
      // Read per wallet, not once for the effect: flipping the flag must
      // re-evaluate every wallet's history, not only the newest one.
      combineLatest([
        wallet.transactionHistory$,
        showShieldedOnlyRows$(stateObservables),
      ]).pipe(
        map(([transactionHistory, showShieldedOnlyRows]) => ({
          activities: transactionHistory
            .filter(
              entry =>
                showShieldedOnlyRows || entryHasUnshieldedActivity(entry),
            )
            .map(txHistoryEntry =>
              mapTxHistoryEntryToActivity({
                accountId: wallet.accountId,
                txHistoryEntry,
                networkId: wallet.networkId,
              }),
            ),
          // No shipped build has ever suppressed these rows, so every upgrading
          // user has them persisted by hash; upsert never removes, so purge them
          // explicitly once their entry reappears in the history.
          suppressedActivityIds: showShieldedOnlyRows
            ? []
            : transactionHistory
                .filter(entry => !entryHasUnshieldedActivity(entry))
                .map(entry => entry.hash),
        })),
        mergeMap(({ activities, suppressedActivityIds }) => [
          actions.activities.upsertActivities({
            accountId: wallet.accountId,
            activities,
          }),
          // Skipped when nothing is suppressed (always, with the flag on) so a
          // steady sync does not dispatch a no-op on every history emission.
          ...(suppressedActivityIds.length > 0
            ? [
                actions.activities.removeActivities({
                  accountId: wallet.accountId,
                  activityIds: suppressedActivityIds,
                }),
              ]
            : []),
          actions.activities.setHasLoadedOldestEntry({
            accountId: wallet.accountId,
            hasLoadedOldestEntry: true,
          }),
          actions.activities.setDesiredLoadedActivitiesCount({
            accountId: wallet.accountId,
            desiredLoadedActivitiesCount: activities.length,
          }),
        ]),
        takeUntil(
          midnightWallets$.pipe(
            filter(wallets => !(wallet.accountId in wallets)),
          ),
        ),
      ),
    ),
  );

export const loadActivityDetails: SideEffect = (
  { activities: { loadActivityDetails$ } },
  _,
  { actions, getMidnightWalletByAccountId, logger },
) =>
  loadActivityDetails$.pipe(
    filter(({ payload: { blockchainName } }) => blockchainName === 'Midnight'),
    map(action => action.payload.activity),
    switchMap(({ activityId, accountId }) =>
      getMidnightWalletByAccountId(accountId).pipe(
        switchMap(wallet =>
          wallet.getTransactionHistoryEntryByHash(activityId).pipe(
            map(txHistoryEntry => {
              if (!txHistoryEntry) {
                return actions.activities.setActivityDetails({
                  activityDetails: undefined,
                });
              }
              return actions.activities.setActivityDetails({
                activityDetails: mapTxHistoryEntryToActivityDetail({
                  accountId: wallet.accountId,
                  txHistoryEntry,
                  networkId: wallet.networkId,
                }),
              });
            }),
            catchError(error => {
              logger.error('Failed to load Midnight activity details', error);
              return EMPTY;
            }),
          ),
        ),
        catchError(() => EMPTY),
      ),
    ),
  );
