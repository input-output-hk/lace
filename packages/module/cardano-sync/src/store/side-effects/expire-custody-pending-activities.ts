import {
  cardanoCustodyActivityMetadataOf,
  UTXO_SYNC_CONFIRMATION_DEPTH,
} from '@lace-contract/cardano-context';
import { whileActive } from '@lace-contract/wallet-active-state';
import { AccountId } from '@lace-contract/wallet-repo';
import { combineLatest, from, map, mergeMap, scan } from 'rxjs';

import type { SideEffect } from '../../module';
import type { Cardano } from '@cardano-sdk/core';
import type { Activity } from '@lace-contract/activities';
import type {
  AccountUtxoMap,
  CardanoAccountTransactionsHistoryMap,
} from '@lace-contract/cardano-context';
import type { AccountSyncStatus } from '@lace-contract/sync';
import type { Timestamp } from '@lace-lib/util';

type Expired = { accountId: AccountId; activityIds: string[] };

/** What the side effect has seen of one account's sync rounds. */
type AccountRounds = {
  /** `pendingSync.startedAt` of the round in progress, as last seen. */
  roundStartedAt?: Timestamp;
  /**
   * The tip slot when that round was first seen. Unknown for a round that
   * was already running when the side effect first saw the account.
   */
  roundTipSlot?: Cardano.Slot;
  lastSuccessfulSync?: Timestamp;
  /**
   * The tip slot at the start of the latest round seen to complete
   * successfully. That round fetched the account's history after the
   * provider reported this tip.
   */
  syncedFromSlot?: Cardano.Slot;
};

type RoundsByAccount = {
  /** False until the first state is seen: rounds running then are of unknown start. */
  hasSeenState: boolean;
  accounts: Partial<Record<AccountId, AccountRounds>>;
};

/**
 * Advances one account's round record. A round starts when `startedAt`
 * changes and completes when it clears with a newer `lastSuccessfulSync`.
 */
const advanceRounds = (
  previous: AccountRounds | undefined,
  status: AccountSyncStatus,
  tipSlot: Cardano.Slot | undefined,
): AccountRounds => {
  const roundStartedAt = status.pendingSync?.startedAt;
  const isSameRound =
    previous !== undefined && roundStartedAt === previous.roundStartedAt;
  // A round already running when the account was first seen has an
  // unknown start.
  const roundTipSlot =
    roundStartedAt === undefined || previous === undefined
      ? undefined
      : isSameRound
      ? previous.roundTipSlot
      : tipSlot;
  const hasCompleted =
    previous?.roundStartedAt !== undefined &&
    !isSameRound &&
    status.lastSuccessfulSync !== previous.lastSuccessfulSync;
  return {
    roundStartedAt,
    roundTipSlot,
    lastSuccessfulSync: status.lastSuccessfulSync,
    syncedFromSlot: hasCompleted
      ? previous.roundTipSlot ?? previous.syncedFromSlot
      : previous?.syncedFromSlot,
  };
};

const trackRounds = (
  { hasSeenState, accounts }: RoundsByAccount,
  [tip, statuses]: [
    Cardano.Tip | undefined,
    Record<AccountId, AccountSyncStatus>,
  ],
): RoundsByAccount => ({
  hasSeenState: true,
  accounts: Object.fromEntries(
    Object.entries(statuses).map(([id, status]) => {
      const accountId = AccountId(id);
      // An account that appears after the first state had no round before.
      const previous = accounts[accountId] ?? (hasSeenState ? {} : undefined);
      return [accountId, advanceRounds(previous, status, tip?.slot)];
    }),
  ),
});

/**
 * Whether a custody operation's pending activity can no longer settle: a
 * round that started once the tip was past its upper validity bound, by
 * the depth the wallet allows its provider to lag, synced the account's
 * history, and neither that history nor the synced UTxOs show the
 * transaction.
 */
const isExpired = (
  activity: Activity,
  {
    syncedFromSlot,
    utxos,
    history,
  }: {
    syncedFromSlot: Cardano.Slot | undefined;
    utxos: readonly Cardano.Utxo[];
    history: readonly { txId: Cardano.TransactionId }[];
  },
): boolean => {
  const invalidHereafter =
    cardanoCustodyActivityMetadataOf(activity)?.invalidHereafter;
  if (invalidHereafter === undefined || syncedFromSlot === undefined) {
    return false;
  }
  if (syncedFromSlot <= invalidHereafter + UTXO_SYNC_CONFIRMATION_DEPTH) {
    return false;
  }
  const txId = activity.activityId;
  return (
    !history.some(item => item.txId === txId) &&
    !utxos.some(([input]) => input.txId === txId)
  );
};

const findExpired = ({
  rounds,
  pendingByAccount,
  utxosByAccount,
  historyByAccount,
}: {
  rounds: RoundsByAccount;
  pendingByAccount: Record<AccountId, Activity[]>;
  utxosByAccount: AccountUtxoMap;
  historyByAccount: CardanoAccountTransactionsHistoryMap;
}): Expired[] =>
  Object.entries(pendingByAccount).flatMap(([id, pending]) => {
    const accountId = AccountId(id);
    const context = {
      syncedFromSlot: rounds.accounts[accountId]?.syncedFromSlot,
      utxos: utxosByAccount[accountId] ?? [],
      history: historyByAccount[accountId] ?? [],
    };
    const activityIds = pending
      .filter(activity => isExpired(activity, context))
      .map(({ activityId }) => activityId);
    return activityIds.length > 0 ? [{ accountId, activityIds }] : [];
  });

/**
 * Drops the pending activity of a custody operation that can no longer
 * settle, so an account does not stay blocked as operation-in-progress when
 * no one waits for the operation (R5.3: state reconciles with the network).
 *
 * A custody submission records its upper validity bound on the pending
 * activity (`blockchainSpecific.Cardano.custody`). Past that bound the
 * transaction can never apply. The chain tip alone does not prove that the
 * wallet saw the outcome: the tip poll updates the tip before the next sync
 * round fetches the history. So the activity is dropped only once a sync
 * round that started with the tip past the bound by
 * `UTXO_SYNC_CONFIRMATION_DEPTH` completed successfully, and neither the
 * account's history nor its synced UTxOs show the transaction. Other
 * pending activities carry no bound and are left alone.
 *
 * It reads state only and makes no provider call. `whileActive` (ADR 29)
 * keeps it off while the wallet is locked. Each activation starts with no
 * completed round, so a round that ran before unlock never counts.
 */
export const expireCustodyPendingActivities: SideEffect = (
  _,
  {
    cardanoContext: {
      selectTip$,
      selectAccountUtxos$,
      selectTransactionHistoryGroupedByAccount$,
    },
    activities: { selectPendingActivitiesByAccount$ },
    sync: { selectSyncStatusByAccount$ },
  },
  { actions, isWalletActive$ },
) =>
  combineLatest([
    combineLatest([selectTip$, selectSyncStatusByAccount$]).pipe(
      scan(trackRounds, { hasSeenState: false, accounts: {} }),
    ),
    selectPendingActivitiesByAccount$,
    selectAccountUtxos$,
    selectTransactionHistoryGroupedByAccount$,
  ]).pipe(
    map(([rounds, pendingByAccount, utxosByAccount, historyByAccount]) =>
      findExpired({
        rounds,
        pendingByAccount,
        utxosByAccount,
        historyByAccount,
      }),
    ),
    mergeMap(expired =>
      from(
        expired.map(({ accountId, activityIds }) =>
          actions.activities.removeActivities({ accountId, activityIds }),
        ),
      ),
    ),
    whileActive(isWalletActive$),
  );
