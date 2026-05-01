/**
 * @vitest-environment jsdom
 */
import { Cardano } from '@cardano-sdk/core';
import { CardanoRewardAccount } from '@lace-contract/cardano-context';
import { BigNumber } from '@lace-sdk/util';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock react-native to avoid parse failure in jsdom environment.
vi.mock('react-native', () => ({
  InteractionManager: {
    runAfterInteractions: vi.fn((callback: () => void) => {
      callback();
      return { cancel: vi.fn() };
    }),
  },
}));

// Mock @lace-lib/ui-toolkit to avoid react-native parse failure.
vi.mock('@lace-lib/ui-toolkit', () => ({
  formatAndGroupActivitiesByDate: vi.fn().mockReturnValue([]),
}));

import * as hooksModule from '../../src/hooks';
import { useStakeDelegation } from '../../src/pages/stake-delegation/useStakeDelegation';

import type { CardanoAccountId, Reward } from '@lace-contract/cardano-context';
import type {
  PoolDetailsSheetProps,
  PoolStatistic,
} from '@lace-lib/ui-toolkit';

vi.mock('../../src/hooks', async importOriginal => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('../../src/hooks')>();
  return {
    ...actual,
    useLaceSelector: vi.fn(),
    useDispatchLaceAction: vi.fn(),
  };
});

vi.mock('@lace-contract/app', async importOriginal => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('@lace-contract/app')>();
  return {
    ...actual,
    useUICustomisation: vi.fn(() => [undefined]),
  };
});

vi.mock('@lace-contract/i18n', async importOriginal => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('@lace-contract/i18n')>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
    }),
  };
});

vi.mock('@lace-lib/navigation', () => ({
  NavigationControls: {
    sheets: {
      close: vi.fn(),
      navigate: vi.fn(),
    },
  },
  SheetRoutes: {
    BrowsePool: 'BrowsePool',
  },
}));

describe('useStakeDelegation', () => {
  const mockUseLaceSelector = vi.mocked(hooksModule.useLaceSelector);
  const mockUseDispatchLaceAction = vi.mocked(
    hooksModule.useDispatchLaceAction,
  );
  const mockAccountId = 'account-123' as CardanoAccountId;
  const rewardAccount = CardanoRewardAccount(
    'stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj',
  );
  const mockPoolId =
    'pool1wn6a6f23ctq06udwhw27ravdpd6zcr7jlut3yez0wzdackz3222' as Cardano.PoolId;

  const mockStakePoolDetailsProps = {
    poolName: 'Test Pool',
    poolTicker: 'TEST',
    saturationPercentage: 0.5,
    informationText: 'Info',
    statisticsMap: {
      activeStake: { label: 'Active Stake', value: '1' },
      liveStake: { label: 'Live Stake', value: '2' },
      delegators: { label: 'Delegators', value: '3' },
      blocks: { label: 'Blocks', value: '4' },
      costPerEpoch: { label: 'Cost Per Epoch', value: '5' },
      pledge: { label: 'Pledge', value: '6' },
      poolMargin: { label: 'Pool Margin', value: '7' },
      ros: { label: 'ROS', value: '8' },
    } satisfies Record<string, PoolStatistic>,
  } as unknown as PoolDetailsSheetProps & {
    statisticsMap: Record<string, PoolStatistic>;
  };

  const mockRewardAccountDetails = {
    rewardAccountInfo: {
      isActive: true,
      poolId: mockPoolId,
      rewardsSum: BigNumber(10000000n),
      withdrawableAmount: BigNumber(10000000n),
      controlledAmount: BigNumber(200000000n),
    },
  };

  const createReward = (
    epoch: number,
    rewards: number,
    poolId?: Cardano.PoolId,
  ): Reward => ({
    epoch: Cardano.EpochNo(epoch),
    rewards: BigNumber(BigInt(rewards)),
    poolId,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseLaceSelector.mockImplementation(
      (selector: string, params?: unknown) => {
        if (selector === 'cardanoContext.selectRewardAccountDetails') {
          return { [mockAccountId]: mockRewardAccountDetails };
        }
        if (selector === 'cardanoContext.selectRewardsHistoryForAccount') {
          return [
            createReward(5, 30000000, mockPoolId),
            createReward(4, 20000000, mockPoolId),
            createReward(3, 10000000, mockPoolId),
            createReward(2, 40000000, 'pool1other' as Cardano.PoolId),
          ];
        }
        if (selector === 'addresses.selectByAccountId') {
          return [
            {
              data: {
                rewardAccount: 'stake_test1abc',
              },
            },
          ];
        }
        if (selector === 'activities.selectByAccountId') {
          return [];
        }
        if (selector === 'activities.selectIsLoadingOlderActivitiesByAccount') {
          return false;
        }
        if (selector === 'activities.selectHasLoadedOldestEntryByAccount') {
          return true;
        }
        if (selector === 'cardanoContext.selectDelegationActivities') {
          return {
            activities: [],
            isLoadingActivities: false,
          };
        }
        if (selector === 'tokens.selectTokensMetadata') {
          return {};
        }
        return params ?? {};
      },
    );

    mockUseDispatchLaceAction.mockImplementation(
      () => vi.fn() as ReturnType<typeof hooksModule.useDispatchLaceAction>,
    );
  });

  it('returns null when stakePoolDetailsProps is null', () => {
    const { result } = renderHook(() =>
      useStakeDelegation({
        accountId: mockAccountId,
        stakePoolDetailsProps: null,
        poolId: mockPoolId,
        rewardAccount,
      }),
    );

    expect(result.current).toBeNull();
  });

  it('computes epochs and epochsScale from rewards history', () => {
    const { result } = renderHook(() =>
      useStakeDelegation({
        accountId: mockAccountId,
        stakePoolDetailsProps: mockStakePoolDetailsProps,
        poolId: mockPoolId,
        rewardAccount,
      }),
    );

    expect(result.current).not.toBeNull();
    expect(result.current?.epochs.map(epoch => epoch.epoch)).toEqual([
      '5',
      '4',
      '3',
    ]);

    // min=10, max=30 (ADA in lovelace)
    expect(result.current?.epochsScale).toEqual([
      10000000, 15000000, 20000000, 25000000, 30000000,
    ]);

    const progressValues = result.current?.epochs.map(epoch => epoch.progress);
    expect(progressValues?.[0]).toBeCloseTo(100, 2);
    expect(progressValues?.[1]).toBeCloseTo(55, 2);
    expect(progressValues?.[2]).toBeCloseTo(10, 2);
  });

  describe('isSecondaryButtonDisabled (de-register button)', () => {
    it('should be disabled when locked (no drepId) AND has unclaimed rewards', () => {
      // Default mock has no drepId and has unclaimed rewards (10000000) - should be disabled
      const { result } = renderHook(() =>
        useStakeDelegation({
          accountId: mockAccountId,
          stakePoolDetailsProps: mockStakePoolDetailsProps,
          poolId: mockPoolId,
          rewardAccount,
        }),
      );

      expect(result.current).not.toBeNull();
      expect(result.current?.isSecondaryButtonDisabled).toBe(true);
    });

    it('should be enabled when locked but no unclaimed rewards', () => {
      mockUseLaceSelector.mockImplementation(
        (selector: string, params?: unknown) => {
          if (selector === 'cardanoContext.selectRewardAccountDetails') {
            return {
              [mockAccountId]: {
                rewardAccountInfo: {
                  isActive: true,
                  poolId: mockPoolId,
                  rewardsSum: BigNumber(10000000n), // Has earned rewards historically
                  withdrawableAmount: BigNumber(0n), // No unclaimed rewards
                  controlledAmount: BigNumber(200000000n),
                  // No drepId - locked state
                },
              },
            };
          }
          if (selector === 'cardanoContext.selectRewardsHistoryForAccount') {
            return [];
          }
          if (selector === 'addresses.selectByAccountId') {
            return [{ data: { rewardAccount: 'stake_test1abc' } }];
          }
          if (selector === 'cardanoContext.selectDelegationActivities') {
            return { activities: [], isLoadingActivities: false };
          }
          if (selector === 'tokens.selectTokensMetadata') {
            return {};
          }
          return params ?? {};
        },
      );

      const { result } = renderHook(() =>
        useStakeDelegation({
          accountId: mockAccountId,
          stakePoolDetailsProps: mockStakePoolDetailsProps,
          poolId: mockPoolId,
          rewardAccount,
        }),
      );

      expect(result.current).not.toBeNull();
      expect(result.current?.isSecondaryButtonDisabled).toBe(false);
    });

    it('should be enabled when has drepId (not locked) even with unclaimed rewards', () => {
      mockUseLaceSelector.mockImplementation(
        (selector: string, params?: unknown) => {
          if (selector === 'cardanoContext.selectRewardAccountDetails') {
            return {
              [mockAccountId]: {
                rewardAccountInfo: {
                  isActive: true,
                  poolId: mockPoolId,
                  rewardsSum: BigNumber(10000000n), // Has rewards
                  withdrawableAmount: BigNumber(10000000n), // Has unclaimed rewards
                  controlledAmount: BigNumber(200000000n),
                  drepId: 'drep1abc123', // Has drepId - not locked
                },
              },
            };
          }
          if (selector === 'cardanoContext.selectRewardsHistoryForAccount') {
            return [createReward(5, 30000000, mockPoolId)];
          }
          if (selector === 'addresses.selectByAccountId') {
            return [{ data: { rewardAccount: 'stake_test1abc' } }];
          }
          if (selector === 'cardanoContext.selectDelegationActivities') {
            return { activities: [], isLoadingActivities: false };
          }
          if (selector === 'tokens.selectTokensMetadata') {
            return {};
          }
          return params ?? {};
        },
      );

      const { result } = renderHook(() =>
        useStakeDelegation({
          accountId: mockAccountId,
          stakePoolDetailsProps: mockStakePoolDetailsProps,
          poolId: mockPoolId,
          rewardAccount,
        }),
      );

      expect(result.current).not.toBeNull();
      expect(result.current?.isSecondaryButtonDisabled).toBe(false);
    });
  });
});
