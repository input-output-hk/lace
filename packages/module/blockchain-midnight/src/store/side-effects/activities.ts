import { Timestamp } from '@lace-lib/util';
import {
  EMPTY,
  catchError,
  filter,
  map,
  mergeMap,
  scan,
  switchMap,
  takeUntil,
} from 'rxjs';

import {
  buildTokenBalanceChangesFromUtxos,
  formatFee,
  getAddressFromUtxos,
  mapStatusToActivityType,
} from '../utils/activities';

import type { SideEffect } from '../..';
import type { Activity, ActivityDetail } from '@lace-contract/activities';
import type {
  MidnightSDKNetworkId,
  MidnightWallet,
  MidnightWalletsByAccountId,
} from '@lace-contract/midnight-context';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { WalletEntry } from '@midnight-ntwrk/wallet-sdk';

export const mapTxHistoryEntryToActivity = ({
  accountId,
  txHistoryEntry,
  networkId,
}: {
  accountId: AccountId;
  txHistoryEntry: WalletEntry;
  networkId?: MidnightSDKNetworkId;
}): Activity => {
  const { hash, timestamp, status } = txHistoryEntry;
  const createdUtxos = txHistoryEntry.unshielded?.createdUtxos ?? [];
  const spentUtxos = txHistoryEntry.unshielded?.spentUtxos ?? [];
  const tokenBalanceChanges = networkId
    ? buildTokenBalanceChangesFromUtxos(createdUtxos, spentUtxos, networkId)
    : [];
  return {
    accountId,
    activityId: hash,
    type: mapStatusToActivityType(status, tokenBalanceChanges),
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

export const updateActivities: SideEffect = (
  _,
  __,
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
      wallet.transactionHistory$.pipe(
        map(transactionHistory =>
          transactionHistory.map(txHistoryEntry =>
            mapTxHistoryEntryToActivity({
              accountId: wallet.accountId,
              txHistoryEntry,
              networkId: wallet.networkId,
            }),
          ),
        ),
        mergeMap(activities => [
          actions.activities.upsertActivities({
            accountId: wallet.accountId,
            activities,
          }),
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
