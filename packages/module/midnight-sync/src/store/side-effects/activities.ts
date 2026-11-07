import { ActivityType } from '@lace-contract/activities';
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

import type { SideEffect } from '../../context';
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
}): Activity | undefined => {
  const { hash, lifecycle } = txHistoryEntry;
  const timestamp =
    txHistoryEntry.timestamp ??
    (lifecycle.status === 'pending'
      ? lifecycle.submittedAt
      : lifecycle.status === 'rejected'
      ? lifecycle.rejectedAt
      : lifecycle.finalizedBlock?.timestamp);
  // A legacy finalized row can have no date at all. Wait for metadata instead
  // of fabricating an epoch/current date in the shared activity list.
  if (!timestamp || !Number.isFinite(timestamp.getTime())) return undefined;
  const status =
    lifecycle.status === 'pending'
      ? undefined
      : lifecycle.status === 'rejected'
      ? 'FAILURE'
      : txHistoryEntry.status;
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
    type: lifecycle.status === 'pending' ? ActivityType.Pending : type,
    timestamp: Timestamp(timestamp.getTime()),
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
}): ActivityDetail | undefined => {
  const createdUtxos = txHistoryEntry.unshielded?.createdUtxos ?? [];
  const spentUtxos = txHistoryEntry.unshielded?.spentUtxos ?? [];
  const activity = mapTxHistoryEntryToActivity({
    accountId,
    txHistoryEntry,
    networkId,
  });
  if (!activity) return undefined;
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

/** Whether history rows without unshielded value changes are shown. */
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
        map(([transactionHistory, showShieldedOnlyRows]) => {
          const canonicalIds = new Set(
            transactionHistory.map(entry => entry.hash),
          );
          const activities: Activity[] = [];
          const suppressedActivityIds: string[] = [];
          for (const txHistoryEntry of transactionHistory) {
            const activity =
              showShieldedOnlyRows || entryHasUnshieldedActivity(txHistoryEntry)
                ? mapTxHistoryEntryToActivity({
                    accountId: wallet.accountId,
                    txHistoryEntry,
                    networkId: wallet.networkId,
                  })
                : undefined;
            if (activity) activities.push(activity);
            // Upsert alone would retain an old optimistic row when a later
            // entry has no displayable metadata or is hidden by the feature gate.
            else suppressedActivityIds.push(txHistoryEntry.hash);
          }
          return {
            activities,
            suppressedActivityIds,
            aliasActivityIds: transactionHistory
              .flatMap(entry => entry.identifiers)
              .filter(id => !canonicalIds.has(id)),
          };
        }),
        mergeMap(({ activities, suppressedActivityIds, aliasActivityIds }) => [
          actions.activities.upsertActivities({
            accountId: wallet.accountId,
            activities,
          }),
          // Avoid a no-op removal on steady history emissions.
          ...(suppressedActivityIds.length + aliasActivityIds.length > 0
            ? [
                actions.activities.removeActivities({
                  accountId: wallet.accountId,
                  activityIds: [
                    ...new Set([...suppressedActivityIds, ...aliasActivityIds]),
                  ],
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
