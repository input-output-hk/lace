/**
 * Which fine print the confirm sheet states before the user signs.
 *
 * Whole sentences rather than assembled fragments: es and ja do not survive
 * concatenation, and both axes are claims the user is being asked to accept —
 * who picked the pool (Lace's, whose rewards fund Lace, or the user's own), and
 * whether a voting delegation rides along at all. A single note credited Lace
 * with a pool the user chose, and promised a DRep to networks that have none.
 *
 * Vote-only is not a third axis here: that flow changes no pool, so it carries
 * its own note and never reaches this table.
 */
const NOTES = {
  chosen: {
    stakeOnly: 'v2.earn-rewards.summary.note-chosen-stake-only',
    withVote: 'v2.earn-rewards.summary.note-chosen',
  },
  promoted: {
    stakeOnly: 'v2.earn-rewards.summary.note-stake-only',
    withVote: 'v2.earn-rewards.summary.note',
  },
} as const;

export const earnRewardsSummaryNoteKey = ({
  hasChosenPool,
  delegatesVote,
}: {
  /** The transaction joins a pool the user picked, not a promoted one. */
  hasChosenPool: boolean;
  delegatesVote: boolean;
}) =>
  NOTES[hasChosenPool ? 'chosen' : 'promoted'][
    delegatesVote ? 'withVote' : 'stakeOnly'
  ];
