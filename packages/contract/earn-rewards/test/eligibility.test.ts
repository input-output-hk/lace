import { describe, expect, it } from 'vitest';

import {
  committedEarnRewardsMode,
  earnRewardsMode,
  isEarnRewardsAudience,
  isEarnRewardsOfferMoot,
} from '../src/eligibility';

import type { EarnRewardsFlowState } from '../src/store/types';

// Loaded, funded, nothing delegated, no pending tx, and a promoted DRep exists.
// Affordability beyond holding any ADA at all is enforced in-flow.
const firstTimer = {
  rewardAccountInfo: {},
  hasPendingTx: false,
  hasAda: true,
  hasDRep: true,
};

describe('earnRewardsMode', () => {
  it('is stake-and-vote for an account with no delegation at all', () => {
    expect(earnRewardsMode(firstTimer)).toBe('stake-and-vote');
  });

  it('is vote-only for an account already delegated to a pool but no DRep', () => {
    expect(
      earnRewardsMode({
        ...firstTimer,
        rewardAccountInfo: { poolId: 'pool1' },
      }),
    ).toBe('vote-only');
  });

  /**
   * Vote-only delivers NOTHING but a vote delegation, so with no promoted DRep
   * it has nothing to deliver: an already-staking account is simply not the
   * audience. Stake-and-vote survives without one — its stake leg stands alone
   * (LW-15293: an absent DRep must not disable staking).
   */
  it('withholds vote-only when no promoted DRep is configured', () => {
    expect(
      earnRewardsMode({
        ...firstTimer,
        rewardAccountInfo: { poolId: 'pool1' },
        hasDRep: false,
      }),
    ).toBeUndefined();
  });

  it('still offers stake-and-vote when no promoted DRep is configured', () => {
    expect(earnRewardsMode({ ...firstTimer, hasDRep: false })).toBe(
      'stake-and-vote',
    );
  });

  it.each<[string, Partial<typeof firstTimer>]>([
    ['reward info is still loading', { rewardAccountInfo: undefined }],
    [
      'the account is already vote-delegated',
      { rewardAccountInfo: { drepId: 'drep1' } },
    ],
    [
      'the account is delegated to both a pool and a DRep',
      { rewardAccountInfo: { poolId: 'pool1', drepId: 'drep1' } },
    ],
    ['a tx is pending for the account', { hasPendingTx: true }],
    ['the account holds no ADA at all', { hasAda: false }],
    [
      'a pool-delegated account holds no ADA',
      { rewardAccountInfo: { poolId: 'pool1' }, hasAda: false },
    ],
  ])('is undefined when %s', (_label, override) => {
    expect(earnRewardsMode({ ...firstTimer, ...override })).toBeUndefined();
  });
});

describe('isEarnRewardsOfferMoot', () => {
  it.each<[string, Parameters<typeof isEarnRewardsOfferMoot>[0], boolean]>([
    // The distinction that matters: unloaded must NOT read as moot, or an eligible
    // account gets its sheet closed mid-load.
    [
      'reward info is still loading',
      { rewardAccountInfo: undefined, hasPendingTx: false },
      false,
    ],
    [
      'nothing is delegated yet',
      { rewardAccountInfo: {}, hasPendingTx: false },
      false,
    ],
    [
      'only a pool is delegated',
      { rewardAccountInfo: { poolId: 'pool1' }, hasPendingTx: false },
      false,
    ],
    [
      'a DRep is delegated',
      { rewardAccountInfo: { drepId: 'drep1' }, hasPendingTx: false },
      true,
    ],
    ['a tx is pending', { rewardAccountInfo: {}, hasPendingTx: true }, true],
  ])('is %s → %s', (_label, input, expected) => {
    expect(isEarnRewardsOfferMoot(input)).toBe(expected);
  });
});

describe('committedEarnRewardsMode', () => {
  const flowState = (status: string, poolId?: string): EarnRewardsFlowState =>
    ({
      status,
      ...(poolId !== undefined && { poolId }),
    } as EarnRewardsFlowState);

  it.each([
    'CalculatingFees',
    'Summary',
    'AwaitingConfirmation',
    'Processing',
    'Success',
    'Error',
  ])('is vote-only in %s when the flow built no pool delegation', status => {
    expect(committedEarnRewardsMode(flowState(status))).toBe('vote-only');
  });

  it.each([
    'CalculatingFees',
    'Summary',
    'AwaitingConfirmation',
    'Processing',
    'Success',
    'Error',
  ])(
    'is stake-and-vote in %s when the flow built a pool delegation',
    status => {
      expect(committedEarnRewardsMode(flowState(status, 'pool1'))).toBe(
        'stake-and-vote',
      );
    },
  );

  it.each<[string, EarnRewardsFlowState | undefined]>([
    ['there is no flow', undefined],
    ['the flow has not started', flowState('Idle')],
  ])('is undefined when %s', (_label, state) => {
    expect(committedEarnRewardsMode(state)).toBeUndefined();
  });
});

describe('isEarnRewardsAudience', () => {
  it.each<[string, Partial<typeof firstTimer>, boolean]>([
    ['nothing is delegated', {}, true],
    [
      'only a pool is delegated',
      { rewardAccountInfo: { poolId: 'pool1' } },
      true,
    ],
    [
      'a DRep is already delegated',
      { rewardAccountInfo: { drepId: 'drep1' } },
      false,
    ],
    ['reward info is still loading', { rewardAccountInfo: undefined }, false],
    ['a tx is pending', { hasPendingTx: true }, false],
    ['the account holds no ADA', { hasAda: false }, false],
  ])('is %s → %s', (_label, override, expected) => {
    expect(isEarnRewardsAudience({ ...firstTimer, ...override })).toBe(
      expected,
    );
  });
});
