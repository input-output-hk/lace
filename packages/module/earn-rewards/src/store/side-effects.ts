import {
  EARN_REWARDS_POOL_SELECTION_PREFIX,
  resolveEarnRewardsTarget,
} from '@lace-contract/earn-rewards';
import { AccountId } from '@lace-contract/wallet-repo';
import { SheetRoutes } from '@lace-lib/navigation';
import { filter, mergeMap, of, withLatestFrom } from 'rxjs';

import type { SideEffect } from '..';
import type { PoolSelection } from '@lace-contract/cardano-stake-pools';

/**
 * Consumes a pool the user picked for the earn-rewards flow and starts the fee
 * calculation with it, then brings the flow's sheet back over the picker.
 *
 * A STORE side effect, not an effect in the sheet, deliberately: while the
 * picker is open the sheet is a covered screen, and the navigator detaches
 * inactive screens (`detachInactiveScreens` in the stack config) — whether a
 * covered screen's effects still run is an implementation detail of the screen
 * library that a funds flow must not depend on. The store runtime always runs.
 * Presenting the flow again therefore goes through the views store rather than
 * `NavigationControls`, which cannot reach the navigator from here.
 *
 * Consumes only when every part of the offer's premise holds — the flow is
 * idle, the feature resolves a target, and that target has NO promoted pool
 * (with one configured, no selection was ever offered, so a matching id is
 * stale state, not an instruction). A REJECTED selection is cleared, not
 * ignored: state observables never re-emit an unchanged value, so residue in
 * the slot can only mislead a later read — it will never be consumed. The
 * selection stays in the slice after consumption: the summary reads its
 * ticker and estimated rate for display, and the sheet clears it when the
 * flow closes.
 */
export const makePoolSelectionConsumption =
  (): SideEffect =>
  (
    _actionObservables,
    {
      cardanoStakePools: { selectPoolSelection$ },
      earnRewardsFlow: { selectEarnRewardsFlowState$ },
      features: { selectLoadedFeatures$ },
      cardanoContext: { selectChainId$, selectRewardAccountDetails$ },
    },
    { actions },
  ) =>
    selectPoolSelection$.pipe(
      filter(
        (selection): selection is PoolSelection =>
          selection !== undefined &&
          selection.selectionId.startsWith(EARN_REWARDS_POOL_SELECTION_PREFIX),
      ),
      withLatestFrom(
        selectEarnRewardsFlowState$,
        selectLoadedFeatures$,
        selectChainId$,
        selectRewardAccountDetails$,
      ),
      mergeMap(
        (
          [selection, flowState, features, chainId, rewardAccountDetails],
          requestId,
        ) => {
          const rejected = of(
            actions.cardanoStakePools.poolSelectionCleared({
              selectionId: selection.selectionId,
            }),
          );
          // Only a flow that is actually running blocks a new pick. The same
          // rule the sheet uses to decide whether dismissing may reset
          // (`isInFlight`): once the user has confirmed, a signing or submission
          // is in the air and a second start would double-submit.
          //
          // A SETTLED flow must not block it. With no promoted pool the entry
          // points open the picker directly, so no sheet mounts to clear the
          // residue of a previous run — and rejecting on it meant the user picked
          // a pool and nothing happened, with the pick cleared behind them.
          const isInFlight =
            flowState?.status === 'AwaitingConfirmation' ||
            flowState?.status === 'Processing';
          if (isInFlight) return rejected;
          const target = resolveEarnRewardsTarget({
            featureFlags: features.featureFlags,
            chainId,
          });
          if (!target || target.poolId !== undefined) return rejected;

          const accountId = AccountId(
            selection.selectionId.slice(
              EARN_REWARDS_POOL_SELECTION_PREFIX.length,
            ),
          );
          // The account's OWN state gates what the pick may start — this is the
          // last check before a transaction is priced, and no caller's mode
          // computation is trusted here. An account with a DRep needs nothing
          // (the offer is moot); one that already stakes keeps its pool — the
          // invariant this flow must never break — so the pick is discarded and
          // the sheet takes over from Idle, where its own machinery runs the
          // vote-only offer. Unloaded info proceeds as before: every entry point
          // verified the mode moments earlier in the same session.
          const info = rewardAccountDetails[accountId]?.rewardAccountInfo;
          if (info?.drepId) return rejected;
          if (info?.poolId) {
            return of(
              actions.cardanoStakePools.poolSelectionCleared({
                selectionId: selection.selectionId,
              }),
              actions.views.setActiveSheetPage({
                route: SheetRoutes.EarnRewards,
                params: { accountId: `${accountId}` },
                requestId,
              }),
            );
          }
          // The pick was made two sheets above the flow — return to it. Pops
          // back to the existing route rather than pushing a duplicate.
          return of(
            // Settled residue from an earlier run, cleared before this one starts
            // so the sheet does not open showing the last attempt's outcome.
            ...(flowState === undefined || flowState.status === 'Idle'
              ? []
              : [actions.earnRewardsFlow.reset()]),
            // Through the views store, NOT NavigationControls: on the extension
            // the store runs in the service worker, where the navigation ref is
            // never set, so a direct call is silently dropped (the app router
            // bridges this action to real navigation in the UI context).
            //
            // `requestId` because the UI holds a replica of the worker's state
            // and a byte-identical page yields no delta: a second pick for the
            // same account would otherwise never re-present the sheet.
            actions.views.setActiveSheetPage({
              route: SheetRoutes.EarnRewards,
              params: { accountId: `${accountId}` },
              requestId,
            }),
            actions.earnRewardsFlow.feeCalculationRequested({
              accountId,
              poolId: selection.poolId,
              dRep: target.dRep,
            }),
          );
        },
      ),
    );
