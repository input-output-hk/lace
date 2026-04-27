/**
 * @vitest-environment jsdom
 */
import { BigNumber } from '@lace-sdk/util';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useIsDeregisterDisabled } from '../src/hooks';

import type { RewardAccountInfo } from '@lace-contract/cardano-context';

describe('useIsDeregisterDisabled', () => {
  const createRewardAccountInfo = (
    overrides: Partial<RewardAccountInfo> = {},
  ): RewardAccountInfo => ({
    isActive: true,
    isRegistered: true,
    rewardsSum: BigNumber(0n),
    withdrawableAmount: BigNumber(0n),
    controlledAmount: BigNumber(0n),
    ...overrides,
  });

  it('returns true when locked (no drepId) AND has unclaimed rewards', () => {
    const rewardAccountInfo = createRewardAccountInfo({
      withdrawableAmount: BigNumber(10000000n),
      // no drepId - locked state
    });

    const { result } = renderHook(() =>
      useIsDeregisterDisabled(rewardAccountInfo),
    );

    expect(result.current).toBe(true);
  });

  it('returns false when locked but no unclaimed rewards (withdrawableAmount is 0)', () => {
    const rewardAccountInfo = createRewardAccountInfo({
      rewardsSum: BigNumber(10000000n), // Has earned rewards historically
      withdrawableAmount: BigNumber(0n), // But no unclaimed rewards
      // no drepId - locked state
    });

    const { result } = renderHook(() =>
      useIsDeregisterDisabled(rewardAccountInfo),
    );

    expect(result.current).toBe(false);
  });

  it('returns false when not locked (has drepId) even with unclaimed rewards', () => {
    const rewardAccountInfo = createRewardAccountInfo({
      withdrawableAmount: BigNumber(10000000n),
      drepId: 'drep1abc123', // Has drepId - not locked
    });

    const { result } = renderHook(() =>
      useIsDeregisterDisabled(rewardAccountInfo),
    );

    expect(result.current).toBe(false);
  });

  it('returns false when rewardAccountInfo is undefined', () => {
    const { result } = renderHook(() => useIsDeregisterDisabled(undefined));

    expect(result.current).toBe(false);
  });
});
