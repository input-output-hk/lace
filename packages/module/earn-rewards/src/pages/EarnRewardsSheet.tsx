import { useAnalytics } from '@lace-contract/analytics';
import {
  ADA_DECIMALS,
  LOVELACE_TOKEN_ID,
} from '@lace-contract/cardano-context';
import { toPercentage } from '@lace-contract/cardano-stake-pools';
import {
  committedEarnRewardsMode,
  earnRewardsMode,
  earnRewardsPoolSelectionId,
  isEarnRewardsOfferMoot,
  needsEarnRewardsPoolChoice,
} from '@lace-contract/earn-rewards';
import { useTranslation, type TFunction } from '@lace-contract/i18n';
import { AccountId } from '@lace-contract/wallet-repo';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import {
  EarnRewardsSummarySheet,
  SendResultTemplate,
  Sheet,
  Shimmer,
  spacing,
} from '@lace-lib/ui-toolkit';
import { formatAmountToLocale } from '@lace-lib/util-render';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';

import { useDispatchLaceAction, useLaceSelector } from '../hooks';
import { useEarnRewardsTarget } from '../target/use-earn-rewards-target';

import { isStaleFlowAtMount } from './stale-flow';
import { earnRewardsSummaryNoteKey } from './summary-note';

import type { SheetScreenProps } from '@lace-lib/navigation';

const ada = (lovelace: string): string =>
  `₳ ${formatAmountToLocale(lovelace, ADA_DECIMALS, 2)}`;

/**
 * The summary's headline rate, or nothing. Three sources, strictly ranked:
 * vote-only shows none (they keep their own pool); a pool the user SELECTED
 * shows its estimate, named and worded as an estimate — but only when it is
 * the pool the built tx delegates to (`txPoolId`), so a stale selection can
 * never caption a transaction that joins a different pool; a promoted pool
 * shows its configured advertised rate. The advertised figure never attaches
 * to a selected pool.
 */
const earningRateLine = ({
  t,
  isVoteOnly,
  selectedPool,
  txPoolId,
  rate,
  isChosenPool,
}: {
  t: TFunction;
  isVoteOnly: boolean;
  /** The tx joins a pool that is not the promoted one. */
  isChosenPool: boolean;
  selectedPool:
    | {
        poolId: string;
        ticker: string | null;
        poolName: string | null;
        ros?: number;
      }
    | undefined;
  txPoolId: string | undefined;
  rate:
    | { kind: 'range'; min: number; max: number }
    | { kind: 'single'; value: number }
    | undefined;
}): string | undefined => {
  if (isVoteOnly) return undefined;
  if (selectedPool && selectedPool.poolId === txPoolId) {
    if (selectedPool.ros === undefined) return undefined;
    return t('v2.earn-rewards.summary.earning-rate-estimate', {
      rate: `${toPercentage(selectedPool.ros)}`,
      pool: selectedPool.ticker ?? selectedPool.poolName ?? selectedPool.poolId,
    });
  }
  // The advertised figure belongs to the PROMOTED pool, so a run that joins
  // another one shows nothing rather than borrowing it. Reachable without a
  // stale selection: dismissing mid-flight clears the pick but keeps the flow,
  // so a reopened run has the chosen pool in its transaction and no details
  // left to caption it with.
  if (!rate || isChosenPool) return undefined;
  return rate.kind === 'range'
    ? t('v2.earn-rewards.summary.earning-rate-range', {
        min: `${rate.min}`,
        max: `${rate.max}`,
      })
    : t('v2.earn-rewards.summary.earning-rate', { rate: `${rate.value}` });
};

export const EarnRewardsSheet = (
  props: SheetScreenProps<SheetRoutes.EarnRewards>,
) => {
  const { accountId: accountIdString } = props.route.params;
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const target = useEarnRewardsTarget();

  const feeCalculationRequested = useDispatchLaceAction(
    'earnRewardsFlow.feeCalculationRequested',
  );
  const earnRewardsRequested = useDispatchLaceAction(
    'earnRewardsFlow.earnRewardsRequested',
  );
  const retryRequested = useDispatchLaceAction(
    'earnRewardsFlow.retryRequested',
  );
  const resetFlow = useDispatchLaceAction('earnRewardsFlow.reset');

  const flowState = useLaceSelector(
    'earnRewardsFlow.selectEarnRewardsFlowState',
  );
  const poolSelection = useLaceSelector(
    'cardanoStakePools.selectPoolSelection',
  );
  const poolSelectionCleared = useDispatchLaceAction(
    'cardanoStakePools.poolSelectionCleared',
  );
  const rewardAccountDetailsMap = useLaceSelector(
    'cardanoContext.selectRewardAccountDetails',
  );
  const pendingActivitiesByAccount = useLaceSelector(
    'activities.selectPendingActivitiesByAccount',
  );
  const fungibleTokens = useLaceSelector(
    'tokens.selectAggregatedFungibleTokensByAccountId',
    accountIdString,
  );

  // Which offer this account gets, from the same rule the entry points use, so
  // the sheet cannot present a different one than the surface that opened it.
  // `vote-only` means the account already stakes: the pool is omitted below so
  // the tx leaves that delegation alone.
  const accountId = AccountId(accountIdString);
  const rewardAccountInfo =
    rewardAccountDetailsMap[accountId]?.rewardAccountInfo;
  const hasPendingTx = (pendingActivitiesByAccount[accountId]?.length ?? 0) > 0;
  const adaAvailable = fungibleTokens.find(
    token => token.tokenId === LOVELACE_TOKEN_ID,
  )?.available;
  const mode = earnRewardsMode({
    rewardAccountInfo,
    hasPendingTx,
    hasAda: adaAvailable !== undefined && BigInt(adaAvailable.toString()) > 0n,
    hasDRep: target?.dRep !== undefined,
  });

  // What the flow committed to wins over what would be offered now — see
  // committedEarnRewardsMode. Falls back to the live rule pre-flow, where
  // "what to offer" is genuinely the question.
  const isVoteOnly =
    (committedEarnRewardsMode(flowState) ?? mode) === 'vote-only';

  // No promoted pool for this network: the user picks one (LW-15293). The pick
  // is keyed to THIS account so a selection made for another flow — or another
  // account, mid-restart — can never be spent here.
  const poolSelectionId = earnRewardsPoolSelectionId(accountIdString);
  const selectedPool =
    poolSelection?.selectionId === poolSelectionId ? poolSelection : undefined;
  // The same rule the entry points branch on, so the sheet and the surface
  // that opened it cannot disagree about whether a pick is owed.
  const shouldChoosePool = needsEarnRewardsPoolChoice({ target, mode });

  /**
   * With no promoted pool the choice IS the flow's first step, so the user goes
   * straight to the pool list rather than to a screen announcing that a choice
   * exists.
   *
   * REPLACES this sheet rather than stacking the list on top of it: closing
   * first means nothing is left underneath to strand. Backing out of the list
   * returns the user to where they started, and the pick re-presents the flow
   * (the consumption side effect) with a pool already in hand. Keeping this
   * sheet mounted below needed a flag to tell "sent them to the list" from
   * "came back empty", and no flag can do that — a route param re-rendered
   * this screen and it read its own outgoing signal as a return.
   *
   * `navigate` defers presentation until the dismissal settles, so the two
   * calls are one replace rather than a race.
   */
  // Hoisted out of the callback below and depended on as a primitive: read
  // inside it, the target is whatever the first render saw — undefined while the
  // feature flags load — and the memo would keep that closure, sending the user
  // to the picker with the stake-only notice for a transaction that does
  // delegate the vote.
  const poolSelectionNotice =
    target?.dRep === undefined ? 'stake' : 'stake-and-vote';
  const hasRequestedPickRef = useRef(false);
  const requestPoolPick = useCallback(() => {
    if (hasRequestedPickRef.current) return;
    hasRequestedPickRef.current = true;
    trackEvent('earn rewards | choose pool | press');
    NavigationControls.closeSheet();
    NavigationControls.navigate(SheetRoutes.BrowsePool, {
      accountId: accountIdString,
      poolSelectionId,
      // What THIS flow's transaction will do, declared rather than left for the
      // picker to infer: the vote leg rides along only when a DRep is promoted.
      poolSelectionNotice,
    });
  }, [accountIdString, poolSelectionId, poolSelectionNotice, trackEvent]);

  // A stale flow present at mount — a terminal left by a mid-flight dismissal,
  // or a pre-submit flow scoped to another account (see isStaleFlowAtMount) —
  // must not be adopted by this surface. Captured by IDENTITY, not status: the
  // funnel effects guard against this exact object, and every later state is a
  // different object, so a genuine same-session state still fires them. The
  // ref is written once at init and never mutated, so no effect ordering can
  // affect the guard.
  const staleStateAtMountRef = useRef(
    isStaleFlowAtMount(flowState, accountId) ? flowState : undefined,
  );
  const isStale = (state: typeof flowState) =>
    state === staleStateAtMountRef.current;

  // Kick off fee calculation once when the sheet opens with a resolved target.
  useEffect(() => {
    if (flowState?.status !== 'Idle') return;
    // Close only on a SETTLED ineligibility — a DRep arrived, or a tx landed
    // between the CTA press and this effect. `mode === undefined` must not be the
    // trigger: it is also true while reward info or the token list loads, so an
    // eligible tap would flash the sheet and dump the user straight back out.
    if (isEarnRewardsOfferMoot({ rewardAccountInfo, hasPendingTx })) {
      NavigationControls.closeSheet();
      return;
    }
    // Still resolving — wait for a later render. The header's close control is the
    // escape hatch, so this cannot strand anyone.
    if (!target || mode === undefined) return;
    // No promoted pool and nothing picked: the choice is this flow's first
    // step, so send the user to the list. The picked pool's fee calculation is
    // fired by the module's consumption side effect — NOT here — because this
    // sheet is a covered screen while the picker is open, and whether a
    // covered screen's effects run is a screen-library detail a funds flow
    // must not depend on.
    // In choose-pool mode this sheet never starts the fee calculation: with no
    // pick yet it sends the user to the list, and once a pick exists the
    // consumption side effect owns the calculation (it has the pool; this
    // render's `target` still has none). Returning in BOTH cases keeps that
    // ownership explicit rather than resting on which of the two dispatches
    // happens to land first — the loser is dropped by the state machine, and
    // if this one won the flow would price a transaction without the pool the
    // user just chose.
    if (shouldChoosePool) {
      if (!selectedPool) requestPoolPick();
      return;
    }
    feeCalculationRequested({
      accountId,
      // Omitted for vote-only: the builder then emits the vote certificate alone.
      ...(mode === 'stake-and-vote' && { poolId: target.poolId }),
      dRep: target.dRep,
    });
  }, [
    target,
    mode,
    accountId,
    shouldChoosePool,
    selectedPool,
    requestPoolPick,
    rewardAccountInfo,
    hasPendingTx,
    flowState?.status,
    feeCalculationRequested,
  ]);

  const handleConfirm = useCallback(() => {
    trackEvent('earn rewards | confirm | press');
    earnRewardsRequested();
  }, [earnRewardsRequested, trackEvent]);

  // Funnel events. Each fires once per transition into its state (flowState is a
  // fresh object only on a real transition). Terminal events fire from the sheet
  // — as staking-center does from its hook — so they need the result screen to
  // render; a mid-flight dismissal (which keeps submitting) is not counted.
  useEffect(() => {
    if (flowState?.status === 'Summary' && !isStale(flowState))
      trackEvent('earn rewards | summary | view');
    // flowState, not status: a stale Summary at mount must not count as a
    // view, and the fresh re-scoped Summary that replaces it still must — the
    // status alone cannot tell them apart.
  }, [flowState, trackEvent]);
  useEffect(() => {
    if (flowState?.status === 'Success' && !isStale(flowState)) {
      const { dRep } = flowState;
      // The advertised rate belongs to the promoted pool, so it is only attached
      // when the conversion actually joined it. A vote-only unlock never showed a
      // rate anywhere, and attaching one would skew the rate-effectiveness
      // segmentation this property exists for.
      const rate = flowState.poolId ? target?.rate : undefined;
      trackEvent('earn rewards | delegation | confirmed', {
        // Which offer converted — lets first-time setup and rewards-unlock be
        // measured separately.
        mode: flowState.poolId ? 'stake-and-vote' : 'vote-only',
        ...(flowState.poolId && { poolId: flowState.poolId }),
        // First-time setup pays the stake-key deposit; a returning staker doesn't.
        hasDeposit: BigInt(flowState.deposit || '0') > 0n,
        // Surfaced only when the flow actually carried one: with no promoted
        // DRep the tx stakes without a vote certificate, and reporting a DRep
        // there would fabricate a delegation that never happened.
        ...(dRep && { drepType: dRep.type, drepId: dRep.drepId }),
        // The rate this conversion was offered (percent), so effectiveness can be
        // segmented by it. "min-max" for a range, the plain number for a single.
        ...(rate !== undefined && {
          advertisedRate:
            rate.kind === 'range'
              ? `${rate.min}-${rate.max}`
              : String(rate.value),
        }),
      });
    }
  }, [flowState, target, trackEvent]);
  useEffect(() => {
    if (flowState?.status === 'Error' && !isStale(flowState)) {
      // phase pinpoints where drop-off happens (fee estimate vs sign vs submit)
      // without emitting the raw provider message.
      trackEvent('earn rewards | delegation | failure', {
        phase: flowState.phase,
      });
    }
  }, [flowState, trackEvent]);

  // Once the user confirms, a signing/submission is in flight. Dismissing then
  // must NOT reset the flow (see the cleanup note below).
  const isInFlight =
    flowState?.status === 'AwaitingConfirmation' ||
    flowState?.status === 'Processing';

  const handleClose = useCallback(() => {
    if (!isInFlight) resetFlow();
    // The pick belongs to this flow; leaving it behind would let a reopened
    // sheet spend a choice the user made in an abandoned run.
    poolSelectionCleared({ selectionId: poolSelectionId });
    NavigationControls.closeSheet();
  }, [isInFlight, resetFlow, poolSelectionCleared, poolSelectionId]);

  // Reset terminal/pre-submit flow state on ANY dismissal — the header X, the
  // backdrop, or the explicit buttons — so reopening starts a fresh flow instead
  // of re-showing the stale result (and unblocks the mount-time fee-calc, which
  // only fires from Idle). But NOT while in flight: resetting from
  // AwaitingConfirmation returns the machine to Idle, so `dropStaleResult`
  // discards the confirmationCompleted result (handled only in
  // AwaitingConfirmation) and the approved tx never submits. The side-effect
  // keeps running after dismissal, so skipping the reset lets it finish.
  const isInFlightRef = useRef(isInFlight);
  isInFlightRef.current = isInFlight;
  const resetFlowRef = useRef(resetFlow);
  resetFlowRef.current = resetFlow;
  const clearSelectionRef = useRef(() => {});
  clearSelectionRef.current = () => {
    poolSelectionCleared({ selectionId: poolSelectionId });
  };
  useEffect(
    () => () => {
      if (!isInFlightRef.current) resetFlowRef.current();
      // The pick dies with the run on EVERY dismissal, not only the header
      // close: a backdrop/gesture dismissal that left it behind made the
      // reopened sheet skip the choose-pool screen while the mount fee-calc
      // stayed suppressed — a permanent loading screen. Unconditional (unlike
      // the flow reset): an in-flight submission owns its tx params already,
      // and a selection has nothing left to contribute.
      clearSelectionRef.current();
    },
    [],
  );

  // A stale flow found at MOUNT (terminal from a mid-flight dismissal, or a
  // pre-submit flow another account's surface left behind): reset so this
  // opening starts a fresh flow scoped to ITS account instead of re-showing —
  // or worse, confirming — the leftover. States reached while the sheet is
  // open render normally (this runs only on mount), and a still-Processing
  // state is deliberately kept — the submit is live and reopening should show
  // its outcome.
  useEffect(() => {
    if (staleStateAtMountRef.current) resetFlowRef.current();
  }, []);

  // Guards a double-tap on "Try again": the second press lands in the same
  // frame, before the Error screen unmounts, so the status check alone would let
  // it through on a stale closure. The ref blocks the dispatch synchronously;
  // the state drives the button's disabled prop. Cleared on leaving Error so a
  // later failure is retriable again.
  const hasRetryDispatchedRef = useRef(false);
  const [hasRetryDispatched, setHasRetryDispatched] = React.useState(false);
  useEffect(() => {
    if (flowState?.status !== 'Error') {
      hasRetryDispatchedRef.current = false;
      setHasRetryDispatched(false);
    }
  }, [flowState?.status]);

  const handleRetry = useCallback(() => {
    if (flowState?.status !== 'Error' || hasRetryDispatchedRef.current) return;
    hasRetryDispatchedRef.current = true;
    setHasRetryDispatched(true);
    retryRequested({
      accountId: flowState.accountId,
      // Carried through as-is: absent means vote-only and must stay that way.
      ...(flowState.poolId && { poolId: flowState.poolId }),
      dRep: flowState.dRep,
    });
  }, [retryRequested, flowState]);

  const breakdown = useMemo(() => {
    if (
      flowState?.status !== 'Summary' &&
      flowState?.status !== 'AwaitingConfirmation' &&
      flowState?.status !== 'Processing'
    ) {
      return undefined;
    }
    const feeLovelace = flowState.fees.reduce(
      (sum, fee) => sum + BigInt(fee.amount.toString()),
      0n,
    );
    const depositLovelace = BigInt(flowState.deposit || '0');
    return {
      hasDeposit: depositLovelace > 0n,
      depositAda: ada(depositLovelace.toString()),
      feeAda: ada(feeLovelace.toString()),
      totalAda: ada((feeLovelace + depositLovelace).toString()),
      // What the built tx actually delegates to — the display must be checked
      // against THIS, never against the selection slice or the live target: a
      // flag refresh between the fee build and signing changes the target, and
      // the fine print describes the transaction the user is signing.
      poolId: flowState.poolId,
      delegatesVote: flowState.dRep !== undefined,
    };
  }, [flowState]);

  // Read from the TRANSACTION, not from the selection slice. Dismissing while
  // signing or submitting clears the pick but deliberately keeps the flow, so a
  // reopened run still has the user's pool in its built tx and no selection to
  // prove it — keyed to `selectedPool`, the summary credited Lace's pool and
  // quoted Lace's advertised rate for it.
  const isChosenPool =
    breakdown?.poolId !== undefined &&
    // A pool on a network that promotes none can only be the user's pick. When
    // one IS promoted, a differing tx pool means the promotion changed under an
    // open sheet — still Lace's recommendation at build time, never a choice.
    target?.poolId === undefined;

  if (flowState?.status === 'Success') {
    return (
      <>
        <Sheet.Header
          title={t(
            isVoteOnly
              ? 'v2.earn-rewards.unlock.success.title'
              : 'v2.earn-rewards.success.title',
          )}
        />
        <SendResultTemplate
          transactionState={{ status: 'success', blockchain: 'Cardano' }}
          subtitle={
            isVoteOnly
              ? t('v2.earn-rewards.unlock.success.subtitle')
              : target?.rewardEstimateDays
              ? t('v2.earn-rewards.success.subtitle', {
                  days: target.rewardEstimateDays,
                })
              : t('v2.earn-rewards.success.subtitle-no-estimate')
          }
          icon={{ name: 'Coins', variant: 'solid', size: 64 }}
          testID="earn-rewards-result-success"
        />
        <Sheet.Footer
          primaryButton={{
            label: t('v2.earn-rewards.success.done-button'),
            onPress: handleClose,
            // Test hook: no other selector reaches this button —
            // SendResultTemplate's footer is generic across every result
            // screen.
            testID: 'earn-rewards-result-success-done-button',
          }}
        />
      </>
    );
  }

  if (flowState?.status === 'Error') {
    return (
      <>
        <Sheet.Header title={t(flowState.errorTranslationKeys.title)} />
        <SendResultTemplate
          transactionState={{ status: 'failure', blockchain: 'Cardano' }}
          subtitle={t(flowState.errorTranslationKeys.subtitle)}
          icon={{ name: 'Sad', variant: 'solid', size: 64 }}
          testID="earn-rewards-result-error"
        />
        <Sheet.Footer
          secondaryButton={{
            label: t('v2.earn-rewards.error.close-button'),
            onPress: handleClose,
          }}
          primaryButton={{
            label: t('v2.earn-rewards.error.primary-button'),
            onPress: handleRetry,
            disabled: hasRetryDispatched,
          }}
        />
      </>
    );
  }

  if (!breakdown || !target) {
    return (
      <>
        {/* Closable like every other branch: fee calculation, target resolution or
            the account's own state can all leave this rendered indefinitely, and a
            header without a close control is a dead end. */}
        <Sheet.Header
          title={t(
            isVoteOnly
              ? 'v2.earn-rewards.unlock.header'
              : 'v2.earn-rewards.header',
          )}
          handleClose={handleClose}
        />
        <Sheet.Scroll contentContainerStyle={styles.loadingContent}>
          <Shimmer.M />
          <Shimmer.M />
          <Shimmer.M />
        </Sheet.Scroll>
      </>
    );
  }

  return (
    <>
      <Sheet.Header
        title={t(
          isVoteOnly
            ? 'v2.earn-rewards.unlock.header'
            : 'v2.earn-rewards.header',
        )}
        handleClose={handleClose}
      />
      <Sheet.Scroll contentContainerStyle={styles.content}>
        <EarnRewardsSummarySheet
          earningRate={earningRateLine({
            t,
            isVoteOnly,
            selectedPool,
            txPoolId: breakdown.poolId,
            rate: target.rate,
            isChosenPool,
          })}
          totalBreakdownLabel={t(
            'v2.earn-rewards.summary.total-breakdown-label',
          )}
          stakeKeyDepositLabel={
            breakdown.hasDeposit
              ? t('v2.earn-rewards.summary.deposit-label')
              : undefined
          }
          stakeKeyDepositAda={
            breakdown.hasDeposit ? breakdown.depositAda : undefined
          }
          transactionFeeLabel={t('v2.earn-rewards.summary.fee-label')}
          transactionFeeAda={breakdown.feeAda}
          totalLabel={t('v2.earn-rewards.summary.total-label')}
          totalAda={breakdown.totalAda}
          note={t(
            isVoteOnly
              ? 'v2.earn-rewards.unlock.summary.note'
              : earnRewardsSummaryNoteKey({
                  hasChosenPool: isChosenPool,
                  delegatesVote: breakdown?.delegatesVote === true,
                }),
          )}
        />
      </Sheet.Scroll>
      <Sheet.Footer
        secondaryButton={{
          label: t('v2.earn-rewards.summary.cancel-button'),
          onPress: handleClose,
        }}
        primaryButton={{
          label: t(
            isVoteOnly
              ? 'v2.earn-rewards.unlock.summary.confirm-button'
              : 'v2.earn-rewards.summary.confirm-button',
          ),
          onPress: handleConfirm,
          loading: isInFlight,
          disabled: isInFlight,
          // Test hook: the label is i18n copy and the footer's testID is
          // shared by every sheet, so this is the only stable selector for
          // Confirm.
          testID: 'earn-rewards-summary-confirm-button',
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  loadingContent: {
    padding: spacing.L,
    gap: spacing.M,
  },
  content: {
    padding: spacing.L,
  },
});
