/**
 * @vitest-environment jsdom
 */
import { AccountId } from '@lace-contract/wallet-repo';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as hooksModule from '../../src/hooks';
import { useBrowsePool } from '../../src/pages/browse-pool/useBrowsePool';

import type { Cardano } from '@cardano-sdk/core';
import type { LacePartialStakePool } from '@lace-contract/cardano-stake-pools';

vi.mock('../../src/hooks', async importOriginal => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('../../src/hooks')>();
  return {
    ...actual,
    useLaceSelector: vi.fn(),
    useSearchStakePools: vi.fn(),
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
      navigate: vi.fn(),
    },
  },
  SheetRoutes: {
    BrowsePoolFilterControls: 'BrowsePoolFilterControls',
    StakePoolDetails: 'StakePoolDetails',
  },
}));

const browsePoolMocks = vi.hoisted(() => {
  const browsePoolOptions = [
    'ticker',
    'saturation',
    'cost',
    'margin',
    'blocks',
    'pledge',
    'liveStake',
  ] as const;
  return { browsePoolOptions };
});

vi.mock('@lace-lib/ui-toolkit', () => ({
  useTheme: vi.fn(() => ({
    layoutSize: 'medium',
    theme: {},
  })),
  getOption: (value?: unknown) =>
    browsePoolMocks.browsePoolOptions.includes(
      value as (typeof browsePoolMocks.browsePoolOptions)[number],
    )
      ? value
      : undefined,
  getOrder: (value: unknown, option?: string) => {
    if (value === 'asc' || value === 'desc') return value;
    if (option === 'ticker' || option === 'cost' || option === 'margin')
      return 'asc';
    if (option) return 'desc';
    return undefined;
  },
}));

vi.mock('@lace-lib/util-render', async importOriginal => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('@lace-lib/util-render')>();
  return {
    ...actual,
    formatEpochEnd: vi.fn(() => '00h 00m 00s'),
  };
});

describe('useBrowsePool', () => {
  const mockUseLaceSelector = vi.mocked(hooksModule.useLaceSelector);
  const mockUseSearchStakePools = vi.mocked(hooksModule.useSearchStakePools);

  const poolA: LacePartialStakePool = {
    poolId: 'pool_a' as Cardano.PoolId,
    ticker: 'AAA',
    liveSaturation: 50,
    cost: 100_000_000,
    margin: 0.01,
    blocks: 100,
    declaredPledge: 1_000_000_000_000,
    liveStake: 2_000_000_000_000,
    activeStake: 0,
    description: null,
    poolName: null,
  };

  const poolB: LacePartialStakePool = {
    poolId: 'pool_b' as Cardano.PoolId,
    ticker: 'BBB',
    liveSaturation: 30,
    cost: 500_000_000,
    margin: 0.05,
    blocks: 200,
    declaredPledge: 2_000_000_000_000,
    liveStake: 2_000_000_000_000,
    activeStake: 0,
    description: null,
    poolName: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseLaceSelector.mockImplementation((selector: string) => {
      if (selector === 'cardanoContext.selectTip') return undefined;
      if (selector === 'cardanoContext.selectEraSummaries') return undefined;
      if (selector === 'cardanoStakePools.selectActiveNetworkData') return null;
      if (selector === 'cardanoContext.selectRewardAccountDetails') return {};
      if (selector === 'network.selectNetworkType') return 'mainnet';
      return undefined;
    });

    mockUseSearchStakePools.mockReturnValue({
      pools: [poolA, poolB],
      isLoading: false,
      totalPoolsCount: 2,
    });
  });

  it('returns pool list as `data` and `cardVariant` undefined when no sort', () => {
    const { result } = renderHook(() =>
      useBrowsePool({
        accountId: 'acc-1',
      }),
    );

    expect(result.current.data).toEqual([poolA, poolB]);
    expect(result.current.cardVariant).toBeUndefined();
    expect(result.current.hasActiveFilters).toBe(false);
    expect(typeof result.current.displayLovelaces).toBe('function');
    expect(result.current.displayLovelaces(1_000_000)).toMatch(/ADA$/);
  });

  it('returns `cardVariant` and sorts `data` when browse sort options are set', () => {
    const { result } = renderHook(() =>
      useBrowsePool({
        accountId: 'acc-1',
        browsePoolSortOption: 'cost',
        browsePoolSortOrder: 'desc',
      }),
    );

    expect(result.current.cardVariant).toBe('cost');
    expect(result.current.hasActiveFilters).toBe(true);
    expect(result.current.data[0].poolId).toBe(poolB.poolId);
    expect(result.current.data[1].poolId).toBe(poolA.poolId);
  });

  it('sorts by ticker ascending when option is ticker and order asc', () => {
    const { result } = renderHook(() =>
      useBrowsePool({
        accountId: 'acc-1',
        browsePoolSortOption: 'ticker',
        browsePoolSortOrder: 'asc',
      }),
    );

    expect(result.current.cardVariant).toBe('ticker');
    expect(result.current.data[0].ticker).toBe('AAA');
    expect(result.current.data[1].ticker).toBe('BBB');
  });

  it('uses tADA in displayLovelaces when network is testnet', () => {
    mockUseLaceSelector.mockImplementation((selector: string) => {
      if (selector === 'network.selectNetworkType') return 'testnet';
      if (selector === 'cardanoContext.selectTip') return undefined;
      if (selector === 'cardanoContext.selectEraSummaries') return undefined;
      if (selector === 'cardanoStakePools.selectActiveNetworkData') return null;
      if (selector === 'cardanoContext.selectRewardAccountDetails') return {};
      return undefined;
    });

    const { result } = renderHook(() =>
      useBrowsePool({
        accountId: 'acc-1',
      }),
    );

    expect(result.current.displayLovelaces(1_000_000)).toMatch(/tADA$/);
  });

  it('excludes from `data` the pool the account is already delegating to', () => {
    mockUseLaceSelector.mockImplementation((selector: string) => {
      if (selector === 'cardanoContext.selectTip') return undefined;
      if (selector === 'cardanoContext.selectEraSummaries') return undefined;
      if (selector === 'cardanoStakePools.selectActiveNetworkData') return null;
      if (selector === 'cardanoContext.selectRewardAccountDetails') {
        return {
          [AccountId('acc-1')]: { rewardAccountInfo: { poolId: poolA.poolId } },
        };
      }
      if (selector === 'network.selectNetworkType') return 'mainnet';
      return undefined;
    });

    const { result } = renderHook(() => useBrowsePool({ accountId: 'acc-1' }));

    expect(result.current.data).toEqual([poolB]);
  });
});
