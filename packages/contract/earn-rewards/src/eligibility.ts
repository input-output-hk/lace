/**
 * The earn-rewards *mode* rules — kept together because the two questions are
 * easy to confuse and the wrong one produces wrong copy:
 *
 * - `earnRewardsMode` — which offer an account should be *made*. Every surface
 *   (portfolio nudge, staking / governance CTA reroutes, locked-rewards sheet)
 *   shares it so they cannot disagree about whether the offer shows or which it is.
 * - `committedEarnRewardsMode` — which offer a running flow actually *made*. Once
 *   a tx exists this is the only valid source for copy: submitting removes the
 *   account from the audience, so the rule above stops describing it.
 */

import type { EarnRewardsFlowState } from './store/types';

/** Reward-account delegation state a surface reads, or `undefined` while it is
 * still loading — an unloaded account is treated as not-yet-eligible so the
 * offer never flickers before the real delegation state arrives. */
export type EarnRewardsDelegationStatus =
  | { poolId?: unknown; drepId?: unknown }
  | undefined;

export type EarnRewardsAudienceInput = {
  rewardAccountInfo: EarnRewardsDelegationStatus;
  hasPendingTx: boolean;
  /**
   * Whether the resolved target carries a promoted DRep. Required, not
   * optional, for the same reason `hasAda` is: the vote-only offer delivers
   * NOTHING but a vote delegation, so with no DRep it has nothing to deliver —
   * a surface that forgot this would offer "unlock rewards" and then build a
   * transaction with no certificate in it. Stake-and-vote survives without a
   * DRep (the stake leg stands alone), so only vote-only gates on it.
   */
  hasDRep: boolean;
  /**
   * Whether the account holds any ADA at all. Required, not optional: every
   * surface must answer it, because a surface that forgets routes an empty
   * account into a flow whose fee calculation cannot succeed and whose error
   * screen offers a retry that never will.
   *
   * This is NOT the affordability floor an earlier draft used and removed — it
   * asks only "any ADA?", none of the stake-key-deposit, locked-min-ADA or
   * change-reserve reasoning that made a 2.5 ADA gate wrong. Whether the balance
   * actually covers deposit + fee stays the in-flow fee calculation's job.
   */
  hasAda: boolean;
};

/**
 * Which offer an eligible account gets:
 *
 * - `stake-and-vote` — nothing delegated yet. One tx registers the stake key if
 *   needed, delegates stake to the promoted pool, and delegates the vote.
 *   Presented as "Earn rewards".
 * - `vote-only` — already delegated to *some* stake pool but no DRep, so rewards
 *   are unclaimable until a vote delegation exists. One tx delegates the vote and
 *   leaves the existing pool delegation untouched. Presented as "Unlock rewards".
 */
export type EarnRewardsMode = 'stake-and-vote' | 'vote-only';

/**
 * The offer for this account, or `undefined` when it isn't the audience.
 *
 * The audience is "no vote delegation yet": an account already delegated to a
 * DRep is excluded, because changing a delegation is a deliberate action for the
 * advanced centers and earn-rewards never messages a corrective one. A pending tx
 * also excludes — it lags the confirmed delegation state and would otherwise
 * flicker the offer during the submit window.
 *
 * Returning the *mode* rather than a boolean is deliberate: a surface that knows
 * it is eligible necessarily knows which copy to show, so the two can never
 * disagree.
 *
 * An entirely empty wallet is excluded via `hasAda` (see the input type for why
 * that lives here rather than at each call site). Affordability beyond "any ADA"
 * is deliberately NOT gated: the in-flow fee calculation owns deposit + fee and
 * surfaces the failure, and a synchronous balance check in the render path cannot
 * see the deposit actually owed, token-locked min-ADA, or a change reserve.
 */
export const earnRewardsMode = ({
  rewardAccountInfo,
  hasPendingTx,
  hasAda,
  hasDRep,
}: EarnRewardsAudienceInput): EarnRewardsMode | undefined => {
  if (!rewardAccountInfo || hasPendingTx || !hasAda) return undefined;
  if (rewardAccountInfo.drepId) return undefined;
  if (rewardAccountInfo.poolId) return hasDRep ? 'vote-only' : undefined;
  return 'stake-and-vote';
};

/** True when the account is the earn-rewards audience in either mode. */
export const isEarnRewardsAudience = (
  input: EarnRewardsAudienceInput,
): boolean => earnRewardsMode(input) !== undefined;

/**
 * True when the offer is *settled* moot for this account — it has a DRep, or a tx
 * is pending — as distinct from not-yet-knowable.
 *
 * `earnRewardsMode` returns `undefined` for both, which is correct for a surface
 * deciding whether to *render* (waiting and declining look the same) but wrong for
 * one deciding whether to *close*: reward info and the token list both start
 * unloaded, so an eligible account transiently reads as ineligible and would be
 * dismissed mid-load.
 *
 * `hasAda` is deliberately not consulted: an absent lovelace entry cannot be told
 * apart from a list that has not loaded, and every entry point already gates on it,
 * so a zero-ADA account does not reach a flow in the first place.
 */
export const isEarnRewardsOfferMoot = ({
  rewardAccountInfo,
  hasPendingTx,
}: Omit<EarnRewardsAudienceInput, 'hasAda' | 'hasDRep'>): boolean =>
  rewardAccountInfo !== undefined &&
  (Boolean(rewardAccountInfo.drepId) || hasPendingTx);

/**
 * The mode a running flow committed to, or `undefined` before one starts.
 *
 * Every state past `Idle` records the pool it built with, and an absent pool means
 * the vote certificate went out alone. Screens showing the *result* of a flow must
 * read from here rather than from `earnRewardsMode`: submitting adds a pending tx
 * — and confirmation sets a DRep — either of which takes the account out of the
 * audience, so the audience rule would report the wrong mode from then on.
 */
export const committedEarnRewardsMode = (
  flowState: EarnRewardsFlowState | undefined,
): EarnRewardsMode | undefined => {
  if (!flowState || flowState.status === 'Idle') return undefined;
  return flowState.poolId === undefined ? 'vote-only' : 'stake-and-vote';
};

/**
 * Whether starting this offer means choosing a pool first: the offer is the
 * first-time `stake-and-vote` one, a target resolves, and no pool is promoted
 * for the network — so there is nothing to delegate to until the user picks
 * (LW-15293).
 *
 * The MODE is part of the question, not decoration. A `vote-only` account
 * already stakes somewhere: its transaction carries a vote certificate and
 * leaves the pool alone, so asking it to choose a pool would collect an answer
 * the flow never spends.
 *
 * Entry points branch on this to open the pool list DIRECTLY rather than
 * opening the flow sheet and redirecting from it. A redirect has to dismiss the
 * sheet it is standing on before it can present the list, and the user watches
 * that happen — one presentation beats a dismissal followed by a presentation.
 */
export const needsEarnRewardsPoolChoice = ({
  target,
  mode,
}: {
  target: { poolId?: unknown } | undefined;
  mode: EarnRewardsMode | undefined;
}): boolean =>
  mode === 'stake-and-vote' &&
  target !== undefined &&
  target.poolId === undefined;
