/**
 * Deterministic props for the stake center benchmarks: one StakeCard per
 * account (alternating staked / stake-available, the two steady states) plus
 * StakingStatusCard summaries indexed by sync tick. No
 * Date.now()/Math.random().
 */
import type React from 'react';

import noop from 'lodash/noop';

import type { StakeCard, StakingStatusCard } from '../../src';

type StakeCardProps = React.ComponentProps<typeof StakeCard>;
type StakingStatusCardProps = React.ComponentProps<typeof StakingStatusCard>;

const POOLS = ['IOG', 'BLADE', 'OCTAS', 'EMURGO'];

export const makeStakeCardProps = (count: number): StakeCardProps[] =>
  Array.from({ length: count }, (_, index) => {
    const isStaked = index % 2 === 0;
    const shared = {
      avatarImage: { uri: `https://avatar.example/${index}.png` },
      accountName: `Account ${index}`,
      accountType: 'Cardano',
      isShielded: false,
      blockchain: 'Cardano' as const,
      coin: 'ADA',
      testID: `perf-stake-${index}`,
    };
    return isStaked
      ? {
          ...shared,
          state: 'low-saturation' as const,
          stakedCoin: `${(index + 1) * 1000}.42`,
          earnedCoin: `${(index + 1) * 10}.07`,
          poolName: POOLS[index % POOLS.length],
          poolStatus: 'active' as const,
          onUpdateDelegation: noop,
          onViewDelegation: noop,
        }
      : {
          ...shared,
          state: 'stake-available' as const,
          balanceCoin: `${(index + 1) * 500}.00`,
          onStake: noop,
        };
  });

/** Summary per sync/epoch tick — every value changes together, as in prod. */
export const makeStakingStatusProps = (
  tick: number,
): StakingStatusCardProps => ({
  status: 'staked',
  totalEarned: `${100 + tick}.${String(tick).padStart(2, '0')}`,
  totalStaked: `${10_000 + tick * 25}.00`,
  totalUnstaked: `${500 - tick * 25}.00`,
});
