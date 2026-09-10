/**
 * Which fine print the first-time nudge states under its CTA.
 *
 * The same two axes the confirm sheet branches on (`earnRewardsSummaryNoteKey`)
 * apply to the offer that STARTS the flow: whether the pool is Lace's promoted
 * one or a choice the tap will send the user to make, and whether a voting
 * delegation rides along. One sentence for all four told a user about to pick
 * their own pool that their stake goes to "the Lace pool", and promised a DRep
 * to networks that promote none.
 *
 * Vote-only is not an axis here: that offer changes no pool and carries its own
 * fine print (`unlock.nudge.fine-print`), chosen by the caller.
 */
const FINE_PRINT = {
  choose: {
    stakeOnly: 'v2.earn-rewards.nudge.fine-print-choose-stake-only',
    withVote: 'v2.earn-rewards.nudge.fine-print-choose',
  },
  promoted: {
    stakeOnly: 'v2.earn-rewards.nudge.fine-print-stake-only',
    withVote: 'v2.earn-rewards.nudge.fine-print',
  },
} as const;

export const earnRewardsNudgeFinePrintKey = ({
  asksForPool,
  delegatesVote,
}: {
  /** No promoted pool: the tap sends the user to pick one. */
  asksForPool: boolean;
  delegatesVote: boolean;
}) =>
  FINE_PRINT[asksForPool ? 'choose' : 'promoted'][
    delegatesVote ? 'withVote' : 'stakeOnly'
  ];
