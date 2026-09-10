import { describe, expect, it } from 'vitest';

import { earnRewardsNudgeFinePrintKey } from '../../src/components/nudge-fine-print';

describe('earnRewardsNudgeFinePrintKey', () => {
  it('credits the Lace pool only when one is promoted', () => {
    expect(
      earnRewardsNudgeFinePrintKey({ asksForPool: false, delegatesVote: true }),
    ).toBe('v2.earn-rewards.nudge.fine-print');
    expect(
      earnRewardsNudgeFinePrintKey({ asksForPool: true, delegatesVote: true }),
    ).toBe('v2.earn-rewards.nudge.fine-print-choose');
  });

  it('promises a DRep only when one will be delegated to', () => {
    expect(
      earnRewardsNudgeFinePrintKey({
        asksForPool: false,
        delegatesVote: false,
      }),
    ).toBe('v2.earn-rewards.nudge.fine-print-stake-only');
    expect(
      earnRewardsNudgeFinePrintKey({ asksForPool: true, delegatesVote: false }),
    ).toBe('v2.earn-rewards.nudge.fine-print-choose-stake-only');
  });

  it('names a distinct string for every combination', () => {
    const keys = [true, false].flatMap(asksForPool =>
      [true, false].map(delegatesVote =>
        earnRewardsNudgeFinePrintKey({ asksForPool, delegatesVote }),
      ),
    );

    expect(new Set(keys).size).toBe(keys.length);
  });
});
