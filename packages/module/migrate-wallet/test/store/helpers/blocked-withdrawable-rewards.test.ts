import {
  DREP_ALWAYS_ABSTAIN,
  DREP_ALWAYS_NO_CONFIDENCE,
} from '@lace-contract/cardano-context';
import { BigNumber } from '@lace-lib/util';
import { describe, expect, it } from 'vitest';

import { blockedWithdrawableRewards } from '../../../src/store/helpers/blocked-withdrawable-rewards';

import type { RewardAccountInfo } from '@lace-contract/cardano-context';

const info = (
  overrides: Partial<Pick<RewardAccountInfo, 'drepId' | 'withdrawableAmount'>>,
): Pick<RewardAccountInfo, 'drepId' | 'withdrawableAmount'> => ({
  withdrawableAmount: BigNumber(0n),
  ...overrides,
});

describe('blockedWithdrawableRewards', () => {
  it('is 0 when there are no reward accounts', () => {
    expect(blockedWithdrawableRewards([])).toBe(0n);
  });

  it('is 0 when a rewards-bearing key is vote-delegated to abstain', () => {
    expect(
      blockedWithdrawableRewards([
        info({
          withdrawableAmount: BigNumber(1_500_000n),
          drepId: DREP_ALWAYS_ABSTAIN,
        }),
      ]),
    ).toBe(0n);
  });

  it('is 0 when a rewards-bearing key is vote-delegated to no-confidence', () => {
    expect(
      blockedWithdrawableRewards([
        info({
          withdrawableAmount: BigNumber(1_500_000n),
          drepId: DREP_ALWAYS_NO_CONFIDENCE,
        }),
      ]),
    ).toBe(0n);
  });

  it('is 0 when there are no withdrawable rewards, even if never vote-delegated', () => {
    expect(
      blockedWithdrawableRewards([info({ withdrawableAmount: BigNumber(0n) })]),
    ).toBe(0n);
  });

  it('returns the amount when rewards exist and the key was never vote-delegated', () => {
    expect(
      blockedWithdrawableRewards([
        info({ withdrawableAmount: BigNumber(1_500_000n) }),
      ]),
    ).toBe(1_500_000n);
  });

  it('is 0 when a rewards-bearing key is vote-delegated to a specific DRep', () => {
    expect(
      blockedWithdrawableRewards([
        info({
          withdrawableAmount: BigNumber(2_000_000n),
          drepId: 'drep1specific',
        }),
      ]),
    ).toBe(0n);
  });

  it('sums only the never-vote-delegated accounts across multiple reward accounts', () => {
    expect(
      blockedWithdrawableRewards([
        info({
          withdrawableAmount: BigNumber(1_000_000n),
          drepId: DREP_ALWAYS_ABSTAIN,
        }),
        info({ withdrawableAmount: BigNumber(3_000_000n) }),
        info({
          withdrawableAmount: BigNumber(500_000n),
          drepId: 'drep1specific',
        }),
      ]),
    ).toBe(3_000_000n);
  });
});
