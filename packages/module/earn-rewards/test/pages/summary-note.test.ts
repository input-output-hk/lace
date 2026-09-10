import { describe, expect, it } from 'vitest';

import { earnRewardsSummaryNoteKey } from '../../src/pages/summary-note';

describe('earnRewardsSummaryNoteKey', () => {
  it('credits Lace only for the pool Lace promoted', () => {
    expect(
      earnRewardsSummaryNoteKey({ hasChosenPool: false, delegatesVote: true }),
    ).toBe('v2.earn-rewards.summary.note');
    expect(
      earnRewardsSummaryNoteKey({ hasChosenPool: true, delegatesVote: true }),
    ).toBe('v2.earn-rewards.summary.note-chosen');
  });

  /**
   * A network with no promoted DRep still reaches this sheet in stake-and-vote
   * mode — `earnRewardsMode` consults `hasDRep` only for an account that
   * already stakes. The promised DRep is the claim that would be false.
   */
  it('promises a DRep only when one will be delegated to', () => {
    expect(
      earnRewardsSummaryNoteKey({ hasChosenPool: false, delegatesVote: false }),
    ).toBe('v2.earn-rewards.summary.note-stake-only');
    expect(
      earnRewardsSummaryNoteKey({ hasChosenPool: true, delegatesVote: false }),
    ).toBe('v2.earn-rewards.summary.note-chosen-stake-only');
  });

  it('names a distinct string for every combination', () => {
    const keys = [true, false].flatMap(hasChosenPool =>
      [true, false].map(delegatesVote =>
        earnRewardsSummaryNoteKey({ hasChosenPool, delegatesVote }),
      ),
    );

    expect(new Set(keys).size).toBe(keys.length);
  });
});
