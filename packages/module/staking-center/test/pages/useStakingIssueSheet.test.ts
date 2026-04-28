/**
 * @vitest-environment jsdom
 */
import { TADA_TOKEN_TICKER } from '@lace-contract/cardano-context';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as hooksModule from '../../src/hooks';
import { useStakingIssueSheet } from '../../src/pages/staking-issue/useStakingIssueSheet';

import type { Cardano } from '@cardano-sdk/core';
import type { LaceStakePool } from '@lace-contract/cardano-stake-pools';

// Mock the hooks
vi.mock('../../src/hooks', async importOriginal => {
  const actual = await importOriginal<typeof hooksModule>();
  return {
    ...actual,
    useLaceSelector: vi.fn(),
    useStakePools: vi.fn(),
  };
});

vi.mock('@lace-contract/i18n', () => ({
  DEFAULT_LANGUAGE: 'en',
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@lace-lib/ui-toolkit', () => ({
  isWeb: false,
  openUrl: vi.fn(),
}));

vi.mock('@lace-lib/navigation', () => ({
  NavigationControls: {
    sheets: {
      navigate: vi.fn(),
    },
    actions: {
      closeAndNavigate: vi.fn(),
    },
  },
  SheetRoutes: {
    BrowsePool: 'BrowsePool',
  },
  StackRoutes: {
    DappExternalWebView: 'DappExternalWebView',
  },
}));

const convertQueryToPoolIds = (
  query: Cardano.PoolId | Cardano.PoolId[] | undefined,
) => (query ? (Array.isArray(query) ? query : [query]) : []);

describe('useStakingIssueSheet', () => {
  const mockUseLaceSelector = vi.mocked(hooksModule.useLaceSelector);
  const mockUseStakePools = vi.mocked(hooksModule.useStakePools);

  const mockAccountId = 'account-123';
  const poolId = 'sp1' as Cardano.PoolId;

  const makeStakePool = (liveSaturation = 50): LaceStakePool => ({
    poolId,
    ticker: 'TEST',
    poolName: 'Test Pool',
    liveSaturation,
    liveStake: 0,
    declaredPledge: 1_000_000,
    margin: 0.01,
    status: 'active',
    activeStake: 0,
    blocks: 0,
    cost: 340_000_000,
    liveDelegators: 0,
    livePledge: 1_000_000,
    description: 'Test pool description',
    owners: [],
    hexId: 'hex',
    ros: 0,
    timestamp: 1,
  });

  const mockRewardAccountDetails = {
    rewardAccountInfo: {
      isActive: true,
      poolId,
      rewardsSum: BigInt(10000000),
      controlledAmount: BigInt(200000000),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    mockUseLaceSelector.mockImplementation((selector: string) => {
      if (selector === 'cardanoContext.selectRewardAccountDetails') {
        return { [mockAccountId]: mockRewardAccountDetails };
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
      if (selector === 'network.selectNetworkType') {
        return 'mainnet';
      }
      return {};
    });

    mockUseStakePools.mockImplementation(poolIds =>
      convertQueryToPoolIds(poolIds).map(() => makeStakePool()),
    );
  });

  describe('when pool data is not available', () => {
    it('should return null when stake pool details are missing for the pool', () => {
      mockUseStakePools.mockImplementation(() => []);

      const { result } = renderHook(() =>
        useStakingIssueSheet(mockAccountId, 'high-saturation'),
      );

      expect(result.current).toBeNull();
    });
  });

  describe('state mapping based on issueType', () => {
    it('should return state "high-saturation" for issueType "high-saturation"', () => {
      const { result } = renderHook(() =>
        useStakingIssueSheet(mockAccountId, 'high-saturation'),
      );

      expect(result.current).not.toBeNull();
      expect(result.current?.state).toBe('high-saturation');
    });

    it('should return state "pledge-not-met" for issueType "pledge"', () => {
      const { result } = renderHook(() =>
        useStakingIssueSheet(mockAccountId, 'pledge'),
      );

      expect(result.current).not.toBeNull();
      expect(result.current?.state).toBe('pledge-not-met');
    });

    it('should return state "locked-rewards" for issueType "locked"', () => {
      const { result } = renderHook(() =>
        useStakingIssueSheet(mockAccountId, 'locked'),
      );

      expect(result.current).not.toBeNull();
      expect(result.current?.state).toBe('locked-rewards');
    });
  });

  describe('discriminated union shape based on issueType', () => {
    it('should include onDelegateVote when issueType is "locked"', () => {
      const { result } = renderHook(() =>
        useStakingIssueSheet(mockAccountId, 'locked'),
      );

      expect(result.current).not.toBeNull();
      expect(result.current?.state).toBe('locked-rewards');
      expect(result.current).toHaveProperty('onDelegateVote');
      expect(typeof result.current?.onDelegateVote).toBe('function');
    });

    it('should not include onDelegateVote when issueType is "high-saturation"', () => {
      const { result } = renderHook(() =>
        useStakingIssueSheet(mockAccountId, 'high-saturation'),
      );

      expect(result.current).not.toBeNull();
      expect(result.current?.state).toBe('high-saturation');
      expect(result.current).not.toHaveProperty('onDelegateVote');
    });

    it('should not include onDelegateVote when issueType is "pledge"', () => {
      const { result } = renderHook(() =>
        useStakingIssueSheet(mockAccountId, 'pledge'),
      );

      expect(result.current).not.toBeNull();
      expect(result.current?.state).toBe('pledge-not-met');
      expect(result.current).not.toHaveProperty('onDelegateVote');
    });
  });

  describe('common props', () => {
    it('should return pool metadata', () => {
      const { result } = renderHook(() =>
        useStakingIssueSheet(mockAccountId, 'high-saturation'),
      );

      expect(result.current).not.toBeNull();
      expect(result.current?.poolName).toBe('Test Pool');
      expect(result.current?.poolTicker).toBe('TEST');
    });

    it('should return formatted amounts', () => {
      const { result } = renderHook(() =>
        useStakingIssueSheet(mockAccountId, 'high-saturation'),
      );

      expect(result.current).not.toBeNull();
      expect(result.current?.coin).toBe('ADA');
      // Check that totalStaked and totalRewards are strings
      expect(typeof result.current?.totalStaked).toBe('string');
      expect(typeof result.current?.totalRewards).toBe('string');
    });

    it('should use tADA ticker when network type is testnet', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'cardanoContext.selectRewardAccountDetails') {
          return { [mockAccountId]: mockRewardAccountDetails };
        }
        if (selector === 'addresses.selectByAccountId') {
          return [{ data: { rewardAccount: 'stake_test1abc' } }];
        }
        if (selector === 'network.selectNetworkType') {
          return 'testnet';
        }
        return {};
      });

      const { result } = renderHook(() =>
        useStakingIssueSheet(mockAccountId, 'high-saturation'),
      );

      expect(result.current).not.toBeNull();
      expect(result.current?.coin).toBe(TADA_TOKEN_TICKER);
    });

    it('should include button labels and handlers', () => {
      const { result } = renderHook(() =>
        useStakingIssueSheet(mockAccountId, 'high-saturation'),
      );

      expect(result.current).not.toBeNull();
      expect(result.current?.primaryButtonLabel).toBe(
        'v2.pool-status.button.update',
      );
      expect(result.current?.secondaryButtonLabel).toBe(
        'v2.pool-status.button.de-register',
      );
      expect(typeof result.current?.onPrimaryPress).toBe('function');
      expect(typeof result.current?.onSecondaryPress).toBe('function');
    });

    it('should return saturation percentage from pool details', () => {
      mockUseStakePools.mockImplementation(poolIds =>
        convertQueryToPoolIds(poolIds).map(() => makeStakePool(75)),
      );

      const { result } = renderHook(() =>
        useStakingIssueSheet(mockAccountId, 'high-saturation'),
      );

      expect(result.current).not.toBeNull();
      expect(result.current?.saturationPercentage).toBe(75);
    });
  });

  describe('warning messages based on issueType', () => {
    it('should return saturationWarningMessage for "high-saturation"', () => {
      const { result } = renderHook(() =>
        useStakingIssueSheet(mockAccountId, 'high-saturation'),
      );

      expect(result.current).not.toBeNull();
      expect(result.current?.primaryWarningMessage).toBeUndefined();
      expect(result.current?.saturationWarningMessage).toBe(
        'v2.pool-status.warning.high-saturation',
      );
    });

    it('should return saturationWarningMessage for "locked"', () => {
      const { result } = renderHook(() =>
        useStakingIssueSheet(mockAccountId, 'locked'),
      );

      expect(result.current).not.toBeNull();
      expect(result.current?.primaryWarningMessage).toBeUndefined();
      expect(result.current?.saturationWarningMessage).toBe(
        'v2.pool-status.warning.locked-rewards',
      );
    });

    it('should return primaryWarningMessage for "pledge"', () => {
      const { result } = renderHook(() =>
        useStakingIssueSheet(mockAccountId, 'pledge'),
      );

      expect(result.current).not.toBeNull();
      expect(result.current?.primaryWarningMessage).toBe(
        'v2.pool-status.warning.pledge-not-met',
      );
      expect(result.current?.saturationWarningMessage).toBeUndefined();
    });

    it('should return primaryWarningMessage for "retiring"', () => {
      const { result } = renderHook(() =>
        useStakingIssueSheet(mockAccountId, 'retiring'),
      );

      expect(result.current).not.toBeNull();
      expect(result.current?.primaryWarningMessage).toBe(
        'v2.pool-status.warning.retiring',
      );
      expect(result.current?.saturationWarningMessage).toBeUndefined();
    });
  });

  describe('isSecondaryButtonDisabled', () => {
    it('should disable de-register button when locked (no drepId) and has unclaimed rewards', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'cardanoContext.selectRewardAccountDetails') {
          return {
            [mockAccountId]: {
              rewardAccountInfo: {
                isActive: true,
                poolId,
                rewardsSum: BigInt(10000000),
                withdrawableAmount: BigInt(10000000), // Has unclaimed rewards
                controlledAmount: BigInt(200000000),
                drepId: undefined, // No DRep - locked
              },
            },
          };
        }
        if (selector === 'addresses.selectByAccountId') {
          return [{ data: { rewardAccount: 'stake_test1abc' } }];
        }
        if (selector === 'network.selectNetworkType') {
          return 'mainnet';
        }
        return {};
      });

      const { result } = renderHook(() =>
        useStakingIssueSheet(mockAccountId, 'locked'),
      );

      expect(result.current).not.toBeNull();
      expect(result.current?.isSecondaryButtonDisabled).toBe(true);
    });

    it('should enable de-register button when locked but no unclaimed rewards', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'cardanoContext.selectRewardAccountDetails') {
          return {
            [mockAccountId]: {
              rewardAccountInfo: {
                isActive: true,
                poolId,
                rewardsSum: BigInt(10000000), // Has earned rewards historically
                withdrawableAmount: BigInt(0), // No unclaimed rewards
                controlledAmount: BigInt(200000000),
                drepId: undefined, // No DRep - locked
              },
            },
          };
        }
        if (selector === 'addresses.selectByAccountId') {
          return [{ data: { rewardAccount: 'stake_test1abc' } }];
        }
        if (selector === 'network.selectNetworkType') {
          return 'mainnet';
        }
        return {};
      });

      const { result } = renderHook(() =>
        useStakingIssueSheet(mockAccountId, 'locked'),
      );

      expect(result.current).not.toBeNull();
      expect(result.current?.isSecondaryButtonDisabled).toBe(false);
    });

    it('should enable de-register button when has drepId (not locked) even with unclaimed rewards', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'cardanoContext.selectRewardAccountDetails') {
          return {
            [mockAccountId]: {
              rewardAccountInfo: {
                isActive: true,
                poolId,
                rewardsSum: BigInt(10000000),
                withdrawableAmount: BigInt(10000000), // Has unclaimed rewards
                controlledAmount: BigInt(200000000),
                drepId: 'drep1abc123', // Has DRep - not locked
              },
            },
          };
        }
        if (selector === 'addresses.selectByAccountId') {
          return [{ data: { rewardAccount: 'stake_test1abc' } }];
        }
        if (selector === 'network.selectNetworkType') {
          return 'mainnet';
        }
        return {};
      });

      const { result } = renderHook(() =>
        useStakingIssueSheet(mockAccountId, 'high-saturation'),
      );

      expect(result.current).not.toBeNull();
      expect(result.current?.isSecondaryButtonDisabled).toBe(false);
    });
  });

  describe('stake key', () => {
    it('should return stake key from addresses', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'cardanoContext.selectRewardAccountDetails') {
          return { [mockAccountId]: mockRewardAccountDetails };
        }
        if (selector === 'addresses.selectByAccountId') {
          return [
            {
              data: {
                rewardAccount: 'stake_test1xyz789',
              },
            },
          ];
        }
        if (selector === 'network.selectNetworkType') {
          return 'mainnet';
        }
        return {};
      });

      const { result } = renderHook(() =>
        useStakingIssueSheet(mockAccountId, 'high-saturation'),
      );

      expect(result.current).not.toBeNull();
      expect(result.current?.stakeKey).toBe('stake_test1xyz789');
    });

    it('should return empty string when no addresses available', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'cardanoContext.selectRewardAccountDetails') {
          return { [mockAccountId]: mockRewardAccountDetails };
        }
        if (selector === 'addresses.selectByAccountId') {
          return [];
        }
        if (selector === 'network.selectNetworkType') {
          return 'mainnet';
        }
        return {};
      });

      const { result } = renderHook(() =>
        useStakingIssueSheet(mockAccountId, 'high-saturation'),
      );

      expect(result.current).not.toBeNull();
      expect(result.current?.stakeKey).toBe('');
    });
  });
});
