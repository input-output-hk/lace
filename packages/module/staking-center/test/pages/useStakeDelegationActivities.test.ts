/**
 * @vitest-environment jsdom
 */
import { ActivityType } from '@lace-contract/activities';
import { CardanoRewardAccount } from '@lace-contract/cardano-context';
import { TokenId } from '@lace-contract/tokens';
import { AccountId } from '@lace-contract/wallet-repo';
import { BigNumber, Timestamp } from '@lace-sdk/util';
import { act, renderHook, waitFor } from '@testing-library/react';
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

// Mock @lace-lib/navigation before any imports that use it
vi.mock('@lace-lib/navigation', () => ({
  NavigationControls: {
    sheets: {
      navigate: vi.fn(),
      close: vi.fn(),
    },
  },
  SheetRoutes: {
    BrowsePool: 'BrowsePool',
    StakeDelegation: 'StakeDelegation',
    StakePoolDetails: 'StakePoolDetails',
  },
}));

import * as hooksModule from '../../src/hooks';
import { useStakeDelegationActivities } from '../../src/pages/stake-delegation/useStakeDelegation';

import type { Activity } from '@lace-contract/activities';

// Mock the hooks
vi.mock('../../src/hooks', () => ({
  useDispatchLaceAction: vi.fn(),
  useLaceSelector: vi.fn(),
}));

describe('useStakeDelegationActivities', () => {
  const accountId = AccountId('test-account-1');
  const rewardAccount = CardanoRewardAccount(
    'stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj',
  );

  const mockLoadAccountDelegations = vi.fn();
  const mockClearAccountDelegationHistory = vi.fn();
  const mockUseLaceSelector = vi.fn();

  const createMockActivity = (
    activityId: string,
    type: ActivityType,
    timestamp: number,
  ): Activity => ({
    accountId,
    activityId,
    type,
    timestamp: Timestamp(timestamp),
    tokenBalanceChanges: [
      {
        tokenId: TokenId('lovelace'),
        amount: BigNumber(BigInt(1000000)),
      },
    ],
  });

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(hooksModule.useDispatchLaceAction).mockImplementation(
      (actionName: string) => {
        if (actionName === 'cardanoContext.loadAccountDelegationHistory') {
          return mockLoadAccountDelegations as ReturnType<
            typeof hooksModule.useDispatchLaceAction
          >;
        }
        if (actionName === 'cardanoContext.clearAccountDelegationHistory') {
          return mockClearAccountDelegationHistory as ReturnType<
            typeof hooksModule.useDispatchLaceAction
          >;
        }
        return vi.fn() as ReturnType<typeof hooksModule.useDispatchLaceAction>;
      },
    );

    vi.mocked(hooksModule.useLaceSelector).mockImplementation(
      mockUseLaceSelector,
    );
  });

  describe('initial state', () => {
    it('should return empty activities and false loading state when no reward account', () => {
      mockUseLaceSelector.mockReturnValue({
        activities: [],
        isLoadingActivities: true,
      });

      const { result } = renderHook(() =>
        useStakeDelegationActivities(
          accountId,
          undefined as unknown as CardanoRewardAccount,
        ),
      );

      expect(result.current.activities).toEqual([]);
      expect(result.current.isLoadingActivities).toBe(false);
      expect(result.current.triggerLoadAccountDelegations).toBeDefined();
    });

    it('should return activities from selector and call selector with correct parameters when reward account is provided', () => {
      const mockActivities = [
        createMockActivity('activity1', ActivityType.Delegation, 1000),
        createMockActivity('activity2', ActivityType.Registration, 2000),
      ];

      mockUseLaceSelector.mockReturnValue({
        activities: mockActivities,
        isLoadingActivities: false,
      });

      const { result } = renderHook(() =>
        useStakeDelegationActivities(accountId, rewardAccount),
      );

      expect(mockUseLaceSelector).toHaveBeenCalledWith(
        'cardanoContext.selectDelegationActivities',
        {
          accountId,
          rewardAccount,
        },
      );

      expect(result.current.activities).toEqual(mockActivities);
      expect(result.current.isLoadingActivities).toBe(false);
    });
  });

  describe('triggerLoadAccountDelegations', () => {
    it('should call loadAccountDelegations with accountId and rewardAccount', async () => {
      mockUseLaceSelector.mockReturnValue({
        activities: [],
        isLoadingActivities: false,
      });

      const { result } = renderHook(() =>
        useStakeDelegationActivities(accountId, rewardAccount),
      );

      act(() => {
        result.current.triggerLoadAccountDelegations();
      });

      await waitFor(() => {
        expect(mockLoadAccountDelegations).toHaveBeenCalledWith({
          accountId,
          rewardAccount,
        });
      });
    });

    it('should not call loadAccountDelegations when reward account is undefined', () => {
      mockUseLaceSelector.mockReturnValue({
        activities: [],
        isLoadingActivities: false,
      });

      const { result } = renderHook(() =>
        useStakeDelegationActivities(
          accountId,
          undefined as unknown as CardanoRewardAccount,
        ),
      );

      result.current.triggerLoadAccountDelegations();

      // Should not call when rewardAccount is undefined
      expect(mockLoadAccountDelegations).not.toHaveBeenCalled();
    });
  });

  describe('cleanup on unmount', () => {
    it('should call clearAccountDelegationHistory on unmount', () => {
      mockUseLaceSelector.mockReturnValue({
        activities: [],
        isLoadingActivities: false,
      });

      const { unmount } = renderHook(() =>
        useStakeDelegationActivities(accountId, rewardAccount),
      );

      unmount();

      expect(mockClearAccountDelegationHistory).toHaveBeenCalledWith({
        accountId,
        rewardAccount,
      });
    });

    it('should call clearAccountDelegationHistory with correct parameters when accountId changes', () => {
      const accountId2 = AccountId('test-account-2');

      mockUseLaceSelector.mockReturnValue({
        activities: [],
        isLoadingActivities: false,
      });

      const { rerender, unmount } = renderHook(
        ({ accountId, rewardAccount }) =>
          useStakeDelegationActivities(accountId, rewardAccount),
        {
          initialProps: { accountId, rewardAccount },
        },
      );

      // Change accountId
      rerender({ accountId: accountId2, rewardAccount });

      unmount();

      // Should clear for the last accountId used
      expect(mockClearAccountDelegationHistory).toHaveBeenCalledWith({
        accountId: accountId2,
        rewardAccount,
      });
    });
  });

  describe('loading states', () => {
    it('should return loading state from selector when reward account is provided', () => {
      mockUseLaceSelector.mockReturnValue({
        activities: [],
        isLoadingActivities: true,
      });

      const { result } = renderHook(() =>
        useStakeDelegationActivities(accountId, rewardAccount),
      );

      expect(result.current.isLoadingActivities).toBe(true);
    });

    it('should return false for loading state when reward account is undefined', () => {
      mockUseLaceSelector.mockReturnValue({
        activities: [],
        isLoadingActivities: true,
      });

      const { result } = renderHook(() =>
        useStakeDelegationActivities(
          accountId,
          undefined as unknown as CardanoRewardAccount,
        ),
      );

      expect(result.current.isLoadingActivities).toBe(false);
    });
  });

  describe('activities filtering', () => {
    it('should return empty array when reward account is undefined', () => {
      const mockActivities = [
        createMockActivity('activity1', ActivityType.Delegation, 1000),
      ];

      mockUseLaceSelector.mockReturnValue({
        activities: mockActivities,
        isLoadingActivities: false,
      });

      const { result } = renderHook(() =>
        useStakeDelegationActivities(
          accountId,
          undefined as unknown as CardanoRewardAccount,
        ),
      );

      expect(result.current.activities).toEqual([]);
    });

    it('should return activities when reward account is provided', () => {
      const mockActivities = [
        createMockActivity('activity1', ActivityType.Delegation, 1000),
        createMockActivity('activity2', ActivityType.Withdrawal, 2000),
        createMockActivity('activity3', ActivityType.Registration, 3000),
      ];

      mockUseLaceSelector.mockReturnValue({
        activities: mockActivities,
        isLoadingActivities: false,
      });

      const { result } = renderHook(() =>
        useStakeDelegationActivities(accountId, rewardAccount),
      );

      expect(result.current.activities).toEqual(mockActivities);
    });
  });

  describe('multiple loads', () => {
    it('should call loadAccountDelegations on multiple triggerLoadAccountDelegations calls', async () => {
      mockUseLaceSelector.mockReturnValue({
        activities: [],
        isLoadingActivities: false,
      });

      const { result } = renderHook(() =>
        useStakeDelegationActivities(accountId, rewardAccount),
      );

      // First load
      act(() => {
        result.current.triggerLoadAccountDelegations();
      });
      await waitFor(() => {
        expect(mockLoadAccountDelegations).toHaveBeenCalledWith({
          accountId,
          rewardAccount,
        });
      });

      // Second load
      act(() => {
        result.current.triggerLoadAccountDelegations();
      });
      await waitFor(() => {
        expect(mockLoadAccountDelegations).toHaveBeenCalledTimes(2);
      });

      // Third load
      act(() => {
        result.current.triggerLoadAccountDelegations();
      });
      await waitFor(() => {
        expect(mockLoadAccountDelegations).toHaveBeenCalledTimes(3);
      });

      // All calls should have the same parameters
      expect(mockLoadAccountDelegations).toHaveBeenCalledWith({
        accountId,
        rewardAccount,
      });
    });
  });

  describe('reward account changes', () => {
    it('should update selector call when reward account changes', () => {
      const rewardAccount2 = CardanoRewardAccount(
        'stake_test1urpklgzqsh9yqz8pkyuxcw9dlszpe5flnxjtl55epla6ftqktdyfz',
      );

      mockUseLaceSelector.mockReturnValue({
        activities: [],
        isLoadingActivities: false,
      });

      const { rerender } = renderHook(
        ({ accountId, rewardAccount }) =>
          useStakeDelegationActivities(accountId, rewardAccount),
        {
          initialProps: { accountId, rewardAccount },
        },
      );

      rerender({ accountId, rewardAccount: rewardAccount2 });

      expect(mockUseLaceSelector).toHaveBeenCalledWith(
        'cardanoContext.selectDelegationActivities',
        {
          accountId,
          rewardAccount: rewardAccount2,
        },
      );
    });
  });
});
