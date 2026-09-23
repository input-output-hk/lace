import { markParameterizedSelector } from '@lace-contract/module';
import { AccountId } from '@lace-contract/wallet-repo';
import { createStateMachineSlice } from '@lace-lib/util-store';
import { createSlice } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';

import { realfiFlowMachine } from './state-machine';

import type {
  RealFiPendingOperation,
  RealFiPosition,
  RealFiPositionSliceState,
  RealFiSubmittedOrderTx,
  RealFiYieldInfo,
} from './types';
import type {
  RealFiCancelStage,
  RealFiCoolingDownUnstake,
  RealFiRPoints,
  RealFiStakeActivity,
  RealFiWithdrawableUnstake,
} from '../provider-types';
import type { RealFiSdkNetwork } from '../realfi-network-config';
import type { RealFiStakeId } from '../value-objects';
import type {
  PayloadAction,
  StateFromReducersMapObject,
} from '@reduxjs/toolkit';
import type * as _immer from 'immer'; // NOSONAR: required so immer's WritableDraft types are referenceable in emitted .d.ts files

// --- Flow slice (transient state machine) ---

const realfiFlowSlice = createStateMachineSlice(realfiFlowMachine, {
  selectors: {
    selectFlowState: state => state,
  },
});

// --- Position slice (persisted positions + cached yield) ---

const positionInitialState: RealFiPositionSliceState = {
  positionsByAccount: {},
  yieldInfoByNetwork: {},
  stakeActivitiesByAccount: {},
  withdrawnActivitiesByAccount: {},
  withdrawableByAccount: {},
  earnBasisRateByNetwork: {},
  stakeInputAssetsByNetwork: {},
  cooldownUnlockAtMsByNetwork: {},
  coolingDownByAccount: {},
  claimedTimelocksByAccount: {},
  submittedOrderTxsByAccount: {},
  hasSeenOnboarding: false,
  rPointsByAccount: {},
  rPointsFetchStatusByAccount: {},
  laceBonusConsumedByAccount: {},
};

// Shared empty results so parameterized selectors keep stable references for
// accounts with no data (reselect input stability — docs/reselect-input-stability).
const EMPTY_ACTIVITIES: RealFiStakeActivity[] = [];
const EMPTY_WITHDRAWABLE: RealFiWithdrawableUnstake[] = [];

type PositionUpsertedPayload = { position: RealFiPosition };
type PositionsReceivedPayload = { positions: RealFiPosition[] };
type PendingOperationAddedPayload = {
  accountId: AccountId;
  operation: RealFiPendingOperation;
};
type PendingOperationClearedPayload = {
  accountId: AccountId;
  stakeId: RealFiStakeId;
};
type YieldInfoReceivedPayload = {
  realfiNetwork: RealFiSdkNetwork;
  yieldInfo: RealFiYieldInfo;
};
type StakeInputAssetsRequestedPayload = {
  realfiNetwork: RealFiSdkNetwork;
};
type StakeInputAssetsReceivedPayload = {
  realfiNetwork: RealFiSdkNetwork;
  /** Verified stake-input asset ids, Sundae dotted form (ADA first if offered). */
  assets: string[];
};
type CooldownUnlockTimeReceivedPayload = {
  realfiNetwork: RealFiSdkNetwork;
  /** Wall-clock (ms) the next cooldown period ends. */
  unlockAtMs: number;
};
type SyncCompletedPayload = { accountId: AccountId; at: number };
type CancelRequestedPayload = {
  accountId: AccountId;
  /** SundaeSwap swap-order id "txHash#index". */
  orderId: string;
  stage: RealFiCancelStage;
};
type StakeActivitiesRequestedPayload = { accountId: AccountId };
type StakeActivitiesReceivedPayload = {
  accountId: AccountId;
  activities: RealFiStakeActivity[];
};
type WithdrawActivitiesRecordedPayload = {
  accountId: AccountId;
  activities: RealFiStakeActivity[];
};
type WithdrawableReceivedPayload = {
  accountId: AccountId;
  unstakes: RealFiWithdrawableUnstake[];
  /** Wall-clock of the read; defaults to now (tests pass explicit values). */
  receivedAtMs?: number;
};
type WithdrawRequestedPayload = {
  accountId: AccountId;
  unstakes: RealFiWithdrawableUnstake[];
};
type WithdrawableClearedPayload = {
  accountId: AccountId;
  /** Timelock UTxOs just claimed — removed from the account's withdraw-ready list. */
  timelockUtxos: { txHash: string; index: number }[];
  /** Wall-clock of the claim submit; defaults to now (tests pass explicit values). */
  clearedAtMs?: number;
};
type CoolingDownReceivedPayload = {
  accountId: AccountId;
  unstakes: RealFiCoolingDownUnstake[];
};
type RPointsRequestedPayload = { accountId: AccountId };
type RPointsReceivedPayload = {
  accountId: AccountId;
  rPoints: RealFiRPoints;
};

/** Newest persisted withdraw-history rows kept per account (unbounded growth
 * guard — the list is persisted and can never be re-derived once trimmed, so
 * the cap is generous). */
const MAX_WITHDRAWN_ROWS_PER_ACCOUNT = 200;

/**
 * How long a just-claimed timelock stays suppressed from withdraw-ready reads
 * while the backend still returns it as unspent (the claim tx's mempool +
 * indexing window). Generous against a slow confirmation; past it a claim
 * whose tx never landed resurfaces and can be retried.
 */
const CLAIMED_TIMELOCK_SUPPRESSION_MS = 10 * 60_000;

/**
 * Unbounded-growth guard on the persisted submitted-order-tx watch list: an
 * entry the feed never clears (tx never confirmed, or an outage outlasting
 * this) is evicted on the next record. Long enough that any real feed outage
 * has been surfaced for days; the list only grows by explicit user submits.
 */
const SUBMITTED_ORDER_TX_MAX_AGE_MS = 7 * 24 * 60 * 60_000;

const timelockKey = (utxo: { txHash: string; index: number }): string =>
  `${utxo.txHash}#${utxo.index}`;

const realfiPositionSlice = createSlice({
  name: 'realfiPosition',
  initialState: positionInitialState,
  reducers: {
    positionUpserted: (
      state,
      { payload }: PayloadAction<PositionUpsertedPayload>,
    ) => {
      state.positionsByAccount[payload.position.accountId] = payload.position;
    },
    positionsReceived: (
      state,
      { payload }: PayloadAction<PositionsReceivedPayload>,
    ) => {
      for (const position of payload.positions) {
        state.positionsByAccount[position.accountId] = position;
      }
    },
    pendingStakeAdded: (
      state,
      { payload }: PayloadAction<PendingOperationAddedPayload>,
    ) => {
      const position = state.positionsByAccount[payload.accountId];
      if (position) {
        position.pendingStake = payload.operation;
      }
    },
    pendingUnstakeAdded: (
      state,
      { payload }: PayloadAction<PendingOperationAddedPayload>,
    ) => {
      const position = state.positionsByAccount[payload.accountId];
      if (position) {
        position.pendingUnstake = payload.operation;
      }
    },
    pendingOperationCleared: (
      state,
      { payload }: PayloadAction<PendingOperationClearedPayload>,
    ) => {
      const position = state.positionsByAccount[payload.accountId];
      if (!position) {
        return;
      }
      if (position.pendingStake?.stakeId === payload.stakeId) {
        position.pendingStake = undefined;
      }
      if (position.pendingUnstake?.stakeId === payload.stakeId) {
        position.pendingUnstake = undefined;
      }
    },
    // The `makeStakeInputAssets` side-effect performs the partner-config read
    // + Sundae discovery in the provider (ADR-19) and dispatches
    // `stakeInputAssetsReceived`. Clearing here makes discovery per-visit: a
    // stale list must not decide ADA availability, so consumers treat the
    // network as unresolved until the fresh response lands.
    stakeInputAssetsRequested: (
      state,
      { payload }: PayloadAction<StakeInputAssetsRequestedPayload>,
    ) => {
      delete state.stakeInputAssetsByNetwork[payload.realfiNetwork];
    },
    stakeInputAssetsReceived: (
      state,
      { payload }: PayloadAction<StakeInputAssetsReceivedPayload>,
    ) => {
      state.stakeInputAssetsByNetwork[payload.realfiNetwork] = payload.assets;
    },
    // Event only: the `makeCooldownUnlockTime` side-effect performs the SDK
    // stakeTimes read in the provider (ADR-19) and dispatches `Received`.
    cooldownUnlockTimeRequested: state => state,
    cooldownUnlockTimeReceived: (
      state,
      { payload }: PayloadAction<CooldownUnlockTimeReceivedPayload>,
    ) => {
      state.cooldownUnlockAtMsByNetwork[payload.realfiNetwork] =
        payload.unlockAtMs;
    },
    // Event only: the `makeYieldInfo` side-effect performs the off-chain read
    // and dispatches `yieldInfoReceived`.
    yieldInfoRequested: state => state,
    yieldInfoReceived: (
      state,
      { payload }: PayloadAction<YieldInfoReceivedPayload>,
    ) => {
      const existing = state.yieldInfoByNetwork[payload.realfiNetwork];
      // A refresh without an APY (annualization feed down / young deployment)
      // keeps the previously-known APY — a partial feed failure must never
      // read as 0% on a value that was known and persisted.
      const incoming = {
        ...payload.yieldInfo,
        apy: payload.yieldInfo.apy ?? existing?.apy,
      };
      // Rate unchanged: advance only `fetchedAt` and keep the displayed value.
      // The freshness stamp must still move so `makeYieldInfo`'s TTL resets —
      // otherwise a stable rate leaves `fetchedAt` frozen and every request
      // past the TTL refetches. The side-effect's TTL guard already suppresses
      // the fetch (so this reducer arm) within the window, so this re-persists
      // at most once per TTL, not on every visit.
      if (
        existing &&
        existing.apy === incoming.apy &&
        existing.exchangeRate === incoming.exchangeRate
      ) {
        existing.fetchedAt = incoming.fetchedAt;
        return;
      }
      state.yieldInfoByNetwork[payload.realfiNetwork] = incoming;
      // First-seen rate = the Total Earned cost basis (LW-14651): earned is
      // the staked balance's appreciation over this rate. Captured once and
      // persisted — a moving basis would silently erase past earnings.
      state.earnBasisRateByNetwork[payload.realfiNetwork] ??=
        payload.yieldInfo.exchangeRate;
    },
    syncCompleted: (
      state,
      { payload }: PayloadAction<SyncCompletedPayload>,
    ) => {
      const position = state.positionsByAccount[payload.accountId];
      if (position) {
        position.lastSuccessfulSync =
          payload.at as RealFiPosition['lastSuccessfulSync'];
      }
    },
    // Event only (no state change): the `makeCancel` side-effect builds + submits
    // the cancel tx. Kept in the position slice so it has a typed action creator.
    cancelRequested: (state, _action: PayloadAction<CancelRequestedPayload>) =>
      state,
    // Event only (no state change): the `makeStakeActivities` side-effect fetches
    // activities + withdrawable via the provider and dispatches the *Received
    // actions below. Kept here for a typed action creator the UI can dispatch.
    stakeActivitiesRequested: (
      state,
      _action: PayloadAction<StakeActivitiesRequestedPayload>,
    ) => state,
    stakeActivitiesReceived: (
      state,
      { payload }: PayloadAction<StakeActivitiesReceivedPayload>,
    ) => {
      state.stakeActivitiesByAccount[payload.accountId] = payload.activities;
      // Feed rows are keyed by the order tx hash, so a watched submit the feed
      // now returns (any status) is reconciled — stop watching it.
      const watched = state.submittedOrderTxsByAccount[payload.accountId];
      if (!watched) return;
      const feedTxHashes = new Set(
        payload.activities.map(activity => activity.id),
      );
      const unresolved = watched.filter(
        orderTx => !feedTxHashes.has(orderTx.txHash),
      );
      if (unresolved.length === 0) {
        delete state.submittedOrderTxsByAccount[payload.accountId];
      } else if (unresolved.length !== watched.length) {
        state.submittedOrderTxsByAccount[payload.accountId] = unresolved;
      }
    },
    // Watch a just-submitted stake/unstake order tx until the RealFi feed
    // returns its order — a confirmed tx still unwatched past the grace period
    // is the USDr detail's feed-mismatch warning condition.
    submittedOrderTxRecorded: (
      state,
      {
        payload,
      }: PayloadAction<{
        accountId: AccountId;
        orderTx: RealFiSubmittedOrderTx;
      }>,
    ) => {
      const fresh = (
        state.submittedOrderTxsByAccount[payload.accountId] ?? []
      ).filter(
        orderTx =>
          payload.orderTx.recordedAt - orderTx.recordedAt <
          SUBMITTED_ORDER_TX_MAX_AGE_MS,
      );
      state.submittedOrderTxsByAccount[payload.accountId] = [
        ...fresh,
        payload.orderTx,
      ];
    },
    // The stake-input token picked in the select-token sheet; read by Manage
    // Stake (mirrors the swap flow's dispatched token selection).
    stakeInputTokenSelected: (
      state,
      { payload }: PayloadAction<{ tokenId: string }>,
    ) => {
      state.selectedStakeInputTokenId = payload.tokenId;
    },
    // Optimistically record completed withdrawals (claims) so they appear in
    // history the instant the claim is signed — the off-chain read can't
    // re-derive them (a claimed unstake drops out of the Executed-order feed).
    // Merged into the history by `selectStakeActivitiesByAccountId`; deduped by
    // id so a row is never doubled.
    withdrawActivitiesRecorded: (
      state,
      { payload }: PayloadAction<WithdrawActivitiesRecordedPayload>,
    ) => {
      const existing =
        state.withdrawnActivitiesByAccount[payload.accountId] ?? [];
      const existingIds = new Set(existing.map(activity => activity.id));
      const fresh = payload.activities.filter(
        activity => !existingIds.has(activity.id),
      );
      if (fresh.length === 0) return;
      // Persisted and append-only by design (a claim can't be re-derived), so
      // cap the per-account list at the newest rows — an unbounded persisted
      // array grows for the life of the install.
      state.withdrawnActivitiesByAccount[payload.accountId] = [
        ...existing,
        ...fresh,
      ]
        .sort((a, b) => b.requestDate - a.requestDate)
        .slice(0, MAX_WITHDRAWN_ROWS_PER_ACCOUNT);
    },
    withdrawableReceived: (
      state,
      { payload }: PayloadAction<WithdrawableReceivedPayload>,
    ) => {
      const tombstones =
        state.claimedTimelocksByAccount[payload.accountId] ?? [];
      if (tombstones.length === 0) {
        state.withdrawableByAccount[payload.accountId] = payload.unstakes;
        return;
      }
      // A read still returning a just-claimed timelock is the mempool window —
      // keep suppressing it. A tombstone the read no longer returns is done
      // (the backend caught up); an expired one lets a stuck claim resurface.
      const receivedAtMs = payload.receivedAtMs ?? Date.now();
      const readKeys = new Set(
        payload.unstakes.map(unstake => timelockKey(unstake.timelockUtxo)),
      );
      const live = tombstones.filter(
        tombstone =>
          readKeys.has(tombstone.key) &&
          receivedAtMs - tombstone.clearedAtMs <
            CLAIMED_TIMELOCK_SUPPRESSION_MS,
      );
      state.claimedTimelocksByAccount[payload.accountId] = live;
      const suppressed = new Set(live.map(tombstone => tombstone.key));
      state.withdrawableByAccount[payload.accountId] = payload.unstakes.filter(
        unstake => !suppressed.has(timelockKey(unstake.timelockUtxo)),
      );
    },
    coolingDownReceived: (
      state,
      { payload }: PayloadAction<CoolingDownReceivedPayload>,
    ) => {
      state.coolingDownByAccount[payload.accountId] = payload.unstakes;
    },
    // Event only: the `makeRPoints` side-effect performs the points-API read in
    // the provider (ADR-19) and dispatches `rPointsReceived`.
    rPointsRequested: (
      state,
      _action: PayloadAction<RPointsRequestedPayload>,
    ) => state,
    rPointsReceived: (
      state,
      { payload }: PayloadAction<RPointsReceivedPayload>,
    ) => {
      state.rPointsByAccount[payload.accountId] = payload.rPoints;
      state.rPointsFetchStatusByAccount[payload.accountId] = 'success';
    },
    // A failed read keeps the previous snapshot (no `Received` dispatch), so
    // the card can't tell fresh from stale data without this — it feeds the
    // `api_status` on the card-impression analytics event (LW-15494).
    rPointsFetchFailed: (
      state,
      { payload }: PayloadAction<{ accountId: AccountId }>,
    ) => {
      state.rPointsFetchStatusByAccount[payload.accountId] = 'failure';
    },
    // Marked when the account's first qualifying swap into USDr is queued:
    // RealFi's engine applies the bonus automatically, and the order-history
    // read won't return the new swap until the backend indexes it — without
    // this flag a second swap made in that window would still show first-swap
    // bonus messaging.
    laceSwapBonusConsumed: (
      state,
      { payload }: PayloadAction<{ accountId: AccountId }>,
    ) => {
      state.laceBonusConsumedByAccount[payload.accountId] = true;
    },
    // Marked when the staking center triggers the onboarding carousel on its
    // first visit; persisted, so the carousel never auto-opens again.
    onboardingShown: state => {
      state.hasSeenOnboarding = true;
    },
    // Active-network switch: accounts are network-specific (ADR-11), and the
    // wallet-wide withdraw/cooldown banners aggregate every keyed account, so
    // entries fetched on the previous network would pollute them until refetch.
    // Clear those transient reads; the network-change primes refetch them.
    // `stakeActivitiesByAccount` is NOT cleared: it is persisted (rehydrates the
    // Staking Activities list) and its only consumer — the detail page — already
    // filters to active-network account ids, so a stale network's rows never
    // show. Persisted state (positions, withdrawn history, yield) stays too.
    transientAccountStateCleared: state => {
      state.withdrawableByAccount = {};
      state.coolingDownByAccount = {};
      state.claimedTimelocksByAccount = {};
      state.rPointsFetchStatusByAccount = {};
    },
    // Event only: the `makeWithdraw` side-effect builds + submits the batched
    // timelock-claim tx. Kept here for a typed action creator the UI dispatches.
    withdrawRequested: (
      state,
      _action: PayloadAction<WithdrawRequestedPayload>,
    ) => {
      // A new claim attempt (incl. the error sheet's Try again) supersedes any
      // recorded failure or stale success.
      delete state.withdrawFailure;
      delete state.withdrawSuccess;
      // Disables every claim CTA until the attempt settles — local component
      // state can't cover the error sheet's Try again re-dispatch.
      state.withdrawInFlight = true;
    },
    // A claim build/submit failed: hold the exact request so the error sheet's
    // Try again can re-dispatch it (LW-14684 — sheet, not toast, for flow errors).
    withdrawFailed: (
      state,
      { payload }: PayloadAction<WithdrawRequestedPayload>,
    ) => {
      state.withdrawFailure = payload;
      delete state.withdrawInFlight;
    },
    // The claim attempt ended without a tx (declined signing prompt, or the
    // side-effect's dependencies were missing) — unlock the claim CTA.
    withdrawDeclined: state => {
      delete state.withdrawInFlight;
    },
    withdrawFailureCleared: state => {
      delete state.withdrawFailure;
    },
    // A claim submitted: hold the summary so the still-open claim sheet can
    // flip to its "Claim completed" success state (LW-14684).
    withdrawSucceeded: (
      state,
      { payload }: PayloadAction<{ accountId: AccountId; amountUsdr: string }>,
    ) => {
      state.withdrawSuccess = payload;
      delete state.withdrawInFlight;
    },
    withdrawSuccessCleared: state => {
      delete state.withdrawSuccess;
    },
    // Event only: the `makeWithdrawFeeQuote` side-effect dry-run-builds the
    // claim tx to price its exact fee; a new request invalidates the old quote.
    withdrawFeeQuoteRequested: (
      state,
      _action: PayloadAction<WithdrawRequestedPayload>,
    ) => {
      delete state.withdrawFeeQuote;
    },
    withdrawFeeQuoteReceived: (
      state,
      {
        payload,
      }: PayloadAction<
        NonNullable<RealFiPositionSliceState['withdrawFeeQuote']>
      >,
    ) => {
      state.withdrawFeeQuote = payload;
    },
    // Event only: the `makeWithdrawables` side-effect refreshes the withdraw-ready
    // timelocks across every active-network account (wallet-wide).
    withdrawablesRequested: state => state,
    // Optimistically drop just-claimed timelocks from the account's withdraw-ready
    // list so the banner/modal clear immediately on submit — a fresh read would
    // still see them until the claim tx confirms (the timelock UTxO stays unspent
    // in the mempool window).
    withdrawableCleared: (
      state,
      { payload }: PayloadAction<WithdrawableClearedPayload>,
    ) => {
      const claimed = new Set(payload.timelockUtxos.map(timelockKey));
      // Tombstone the claimed timelocks so the next withdraw-ready read — which
      // still sees them unspent until the claim tx confirms — can't resurrect
      // the banner (`withdrawableReceived` filters against these).
      const clearedAtMs = payload.clearedAtMs ?? Date.now();
      const remembered = (
        state.claimedTimelocksByAccount[payload.accountId] ?? []
      ).filter(tombstone => !claimed.has(tombstone.key));
      state.claimedTimelocksByAccount[payload.accountId] = [
        ...remembered,
        ...[...claimed].map(key => ({ key, clearedAtMs })),
      ];
      const existing = state.withdrawableByAccount[payload.accountId];
      if (!existing) return;
      state.withdrawableByAccount[payload.accountId] = existing.filter(
        unstake => !claimed.has(timelockKey(unstake.timelockUtxo)),
      );
    },
  },
  selectors: {
    selectAllPositions: state => state.positionsByAccount,
    selectYieldInfoByNetwork: state => state.yieldInfoByNetwork,
    selectStakeInputAssetsByNetwork: state => state.stakeInputAssetsByNetwork,
    selectCooldownUnlockAtMsByNetwork: state =>
      state.cooldownUnlockAtMsByNetwork,
    selectAllStakeActivities: state => state.stakeActivitiesByAccount,
    selectAllWithdrawnActivities: state => state.withdrawnActivitiesByAccount,
    selectAllWithdrawable: state => state.withdrawableByAccount,
    selectEarnBasisRateByNetwork: state => state.earnBasisRateByNetwork,
    selectWithdrawFailure: state => state.withdrawFailure,
    selectWithdrawInFlight: state => state.withdrawInFlight === true,
    selectWithdrawSuccess: state => state.withdrawSuccess,
    selectWithdrawFeeLovelace: state => state.withdrawFeeQuote?.feeLovelace,
    selectWithdrawFeeQuote: state => state.withdrawFeeQuote,
    selectCoolingDownByAccount: state => state.coolingDownByAccount,
    selectSelectedStakeInputTokenId: state => state.selectedStakeInputTokenId,
    selectSubmittedOrderTxsByAccount: state => state.submittedOrderTxsByAccount,
    selectHasSeenOnboarding: state => state.hasSeenOnboarding,
    selectAllRPoints: state => state.rPointsByAccount,
    selectRPointsFetchStatusByAccount: state =>
      state.rPointsFetchStatusByAccount,
    selectLaceBonusConsumedByAccount: state => state.laceBonusConsumedByAccount,
  },
});

// --- Parameterized selectors (markParameterizedSelector for side-effect detection) ---

const selectYieldInfo = markParameterizedSelector(
  createSelector(
    realfiPositionSlice.selectors.selectYieldInfoByNetwork,
    (_: unknown, realfiNetwork: RealFiSdkNetwork) => realfiNetwork,
    (yieldInfoByNetwork, realfiNetwork): RealFiYieldInfo | undefined =>
      yieldInfoByNetwork[realfiNetwork],
  ),
);

const selectPositionByAccountId = markParameterizedSelector(
  createSelector(
    realfiPositionSlice.selectors.selectAllPositions,
    (_: unknown, accountId: AccountId) => accountId,
    (positionsByAccount, accountId): RealFiPosition | undefined =>
      positionsByAccount[accountId],
  ),
);

const selectStakedSusdrByAccountId = markParameterizedSelector(
  createSelector(
    realfiPositionSlice.selectors.selectAllPositions,
    (_: unknown, accountId: AccountId) => accountId,
    (positionsByAccount, accountId): string =>
      positionsByAccount[accountId]?.stakedSusdr ?? '0',
  ),
);

const selectClaimableAdaByAccountId = markParameterizedSelector(
  createSelector(
    realfiPositionSlice.selectors.selectAllPositions,
    (_: unknown, accountId: AccountId) => accountId,
    (positionsByAccount, accountId): string | undefined =>
      positionsByAccount[accountId]?.claimableAda,
  ),
);

const selectStakeActivitiesByAccountId = markParameterizedSelector(
  createSelector(
    realfiPositionSlice.selectors.selectAllStakeActivities,
    realfiPositionSlice.selectors.selectAllWithdrawnActivities,
    (_: unknown, accountId: AccountId) => accountId,
    (readByAccount, withdrawnByAccount, accountId): RealFiStakeActivity[] => {
      const read = readByAccount[accountId] ?? EMPTY_ACTIVITIES;
      const withdrawn = withdrawnByAccount[accountId] ?? EMPTY_ACTIVITIES;
      // Optimistic withdraw rows the read doesn't already contain (deduped by
      // id), newest-first. Return the read list unchanged when there are none so
      // the reference stays stable (reselect input stability).
      if (withdrawn.length === 0) return read;
      const readIds = new Set(read.map(activity => activity.id));
      const extra = withdrawn.filter(activity => !readIds.has(activity.id));
      if (extra.length === 0) return read;
      return [...read, ...extra].sort((a, b) => b.requestDate - a.requestDate);
    },
  ),
);

const selectWithdrawableByAccountId = markParameterizedSelector(
  createSelector(
    realfiPositionSlice.selectors.selectAllWithdrawable,
    (_: unknown, accountId: AccountId) => accountId,
    (byAccount, accountId): RealFiWithdrawableUnstake[] =>
      byAccount[accountId] ?? EMPTY_WITHDRAWABLE,
  ),
);

/**
 * Whether the one-time Lace acquisition bonus (LW-15495 AC4/AC5) is still
 * available to the account. RealFi's SDK exposes no bonus-used flag, so this
 * derives from the engine's own order history: any prior swap(-into-USDr)
 * order — whatever surface placed it — means the first-swap bonus is no longer
 * available (conservative: never promises a bonus the engine may not grant).
 * The local consumed flag covers the window before the history read returns a
 * just-queued first swap.
 */
const selectIsLaceSwapBonusAvailableByAccountId = markParameterizedSelector(
  createSelector(
    realfiPositionSlice.selectors.selectAllStakeActivities,
    realfiPositionSlice.selectors.selectLaceBonusConsumedByAccount,
    (_: unknown, accountId: AccountId) => accountId,
    (activitiesByAccount, consumedByAccount, accountId): boolean => {
      if (consumedByAccount[accountId]) return false;
      const activities = activitiesByAccount[accountId];
      // Unread history is NOT an empty history: a restored or second-device
      // wallet has no rows until the read lands. The engine applies the bonus
      // on its own, so withholding the callout costs the user nothing, while
      // promising a bonus already spent elsewhere misleads them.
      if (activities === undefined) return false;
      return !activities.some(activity => activity.kind === 'swap');
    },
  ),
);

/** Every withdraw-ready timelock across all accounts, each tagged with its account. */
export type RealFiWithdrawableWithAccount = RealFiWithdrawableUnstake & {
  accountId: AccountId;
};
/**
 * USD earned per staked sUSDr (display unit) per network: the live vault
 * rate's appreciation over the first-seen basis, floored at zero (a defensive
 * clamp — a rate below the basis must not render negative earnings).
 */
const selectEarnedUsdPerSusdrByNetwork = createSelector(
  realfiPositionSlice.selectors.selectYieldInfoByNetwork,
  realfiPositionSlice.selectors.selectEarnBasisRateByNetwork,
  (yieldInfoByNetwork, basisByNetwork) =>
    Object.fromEntries(
      Object.entries(yieldInfoByNetwork).map(([network, info]) => [
        network,
        Math.max(
          0,
          (info?.exchangeRate ?? 0) -
            (basisByNetwork[network as RealFiSdkNetwork] ??
              info?.exchangeRate ??
              0),
        ),
      ]),
    ) as Partial<Record<RealFiSdkNetwork, number>>,
);

const selectAllWithdrawables = createSelector(
  realfiPositionSlice.selectors.selectAllWithdrawable,
  (byAccount): RealFiWithdrawableWithAccount[] =>
    Object.entries(byAccount).flatMap(([accountId, list]) =>
      (list ?? []).map(unstake => ({
        ...unstake,
        accountId: AccountId(accountId),
      })),
    ),
);

/** A staking-history row tagged with the account it belongs to. */
export type RealFiStakeActivityWithAccount = RealFiStakeActivity & {
  accountId: AccountId;
};

/**
 * The staking history across every account (wallet-wide), matching the USDr
 * detail screen's aggregated balance/rewards scope — a per-account list there
 * silently shows nothing when the staking history lives on a different wallet
 * than the arbitrary account the screen resolves. Read rows merge with the
 * optimistic withdraw rows the reads don't yet contain (deduped by id),
 * newest-first, each tagged with its owning account for per-row navigation.
 */
const selectCombinedStakeActivities = createSelector(
  realfiPositionSlice.selectors.selectAllStakeActivities,
  realfiPositionSlice.selectors.selectAllWithdrawnActivities,
  (readByAccount, withdrawnByAccount): RealFiStakeActivityWithAccount[] => {
    const tag = (
      byAccount: Partial<Record<AccountId, RealFiStakeActivity[]>>,
    ): RealFiStakeActivityWithAccount[] =>
      Object.entries(byAccount).flatMap(([accountId, list]) =>
        (list ?? []).map(activity => ({
          ...activity,
          accountId: AccountId(accountId),
        })),
      );
    const read = tag(readByAccount);
    const readIds = new Set(read.map(activity => activity.id));
    const extra = tag(withdrawnByAccount).filter(
      activity => !readIds.has(activity.id),
    );
    return [...read, ...extra].sort((a, b) => b.requestDate - a.requestDate);
  },
);

/** Every in-cooldown unstake across all accounts (flattened; wallet-wide). */
const selectAllCoolingDown = createSelector(
  realfiPositionSlice.selectors.selectCoolingDownByAccount,
  (byAccount): RealFiCoolingDownUnstake[] =>
    Object.values(byAccount).flatMap(list => list ?? []),
);

/**
 * Total unstaked funds still mid-flow (cooldown + withdraw-ready timelocks),
 * wallet-wide, in USDr base units. These have left the wallet balance, so
 * balance displays must add this on top of wallet-token sums (LW-14651 AC1).
 */
const selectPendingUnstakeTotalBaseUnits = createSelector(
  realfiPositionSlice.selectors.selectCoolingDownByAccount,
  realfiPositionSlice.selectors.selectAllWithdrawable,
  (coolingDownByAccount, withdrawableByAccount): string => {
    const pending: { usdrAmount: string }[] = [
      ...Object.values(coolingDownByAccount).flatMap(list => list ?? []),
      ...Object.values(withdrawableByAccount).flatMap(list => list ?? []),
    ];
    return pending
      .reduce((sum, unstake) => sum + BigInt(unstake.usdrAmount), 0n)
      .toString();
  },
);

const selectStakeActivityById = markParameterizedSelector(
  createSelector(
    realfiPositionSlice.selectors.selectAllStakeActivities,
    realfiPositionSlice.selectors.selectAllWithdrawnActivities,
    (_: unknown, params: { accountId: AccountId; activityId: string }) =>
      params,
    (
      readByAccount,
      withdrawnByAccount,
      { accountId, activityId },
    ): RealFiStakeActivity | undefined =>
      (readByAccount[accountId] ?? EMPTY_ACTIVITIES).find(
        activity => activity.id === activityId,
      ) ??
      (withdrawnByAccount[accountId] ?? EMPTY_ACTIVITIES).find(
        activity => activity.id === activityId,
      ),
  ),
);

// --- Exports (frozen names) ---

export const realfiStakingReducers = {
  realfiFlow: realfiFlowSlice.reducer,
  realfiPosition: realfiPositionSlice.reducer,
};

export const realfiStakingActions = {
  realfiFlow: realfiFlowSlice.actions,
  realfiPosition: realfiPositionSlice.actions,
};

export const realfiStakingSelectors = {
  realfiFlow: { ...realfiFlowSlice.selectors },
  realfiPosition: {
    ...realfiPositionSlice.selectors,
    selectPositionByAccountId,
    selectStakedSusdrByAccountId,
    selectClaimableAdaByAccountId,
    selectStakeActivitiesByAccountId,
    selectCombinedStakeActivities,
    selectWithdrawableByAccountId,
    selectYieldInfo,
    selectAllWithdrawables,
    selectEarnedUsdPerSusdrByNetwork,
    selectPendingUnstakeTotalBaseUnits,
    selectAllCoolingDown,
    selectStakeActivityById,
    selectIsLaceSwapBonusAvailableByAccountId,
  },
};

export type RealFiStakingStoreState = StateFromReducersMapObject<
  typeof realfiStakingReducers
>;
