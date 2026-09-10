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
    'ranking',
    'ros',
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
  getDefaultSortOrder: (option: string) =>
    option === 'ticker' || option === 'cost' || option === 'margin'
      ? 'asc'
      : 'desc',
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

  const poolC: LacePartialStakePool = {
    ...poolB,
    poolId: 'pool_c' as Cardano.PoolId,
    ticker: 'CCC',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseLaceSelector.mockImplementation((selector: string) => {
      if (selector === 'cardanoContext.selectTip') return undefined;
      if (selector === 'cardanoContext.selectEraSummaries') return undefined;
      if (selector === 'cardanoStakePools.selectActiveNetworkData') return null;
      if (selector === 'cardanoContext.selectRewardAccountDetails') return {};
      if (selector === 'network.selectNetworkType') return 'mainnet';
      // Read only in selection mode, to decide whether the notice
      // mentions the vote delegation riding along.
      if (selector === 'features.selectLoadedFeatures')
        return { featureFlags: [] };
      return undefined;
    });

    mockUseSearchStakePools.mockReturnValue({
      pools: [
        { ...poolA, ros: 0.02, recommendation: 1 },
        { ...poolB, ros: 0.035, recommendation: 2 },
      ],
      isLoading: false,
      totalPoolsCount: 2,
    });
  });

  /**
   * The default is the protocol's own ranking, not the rate a pool pays today:
   * ordering by the latter flatters a pool that is small and lucky and says
   * nothing about what it pays once stake arrives. The filter indicator still
   * only lights for a user's own choice.
   *
   * Here the higher-rate pool also ranks higher; the test below separates the
   * two so the default cannot silently revert to the rate.
   */
  it('defaults to the ranking order, best first, with no user sort', () => {
    const { result } = renderHook(() =>
      useBrowsePool({
        accountId: 'acc-1',
      }),
    );

    expect(result.current.data.map(pool => pool.poolId)).toEqual([
      poolB.poolId,
      poolA.poolId,
    ]);
    expect(result.current.cardVariant).toBe('ranking');
    expect(result.current.hasActiveFilters).toBe(false);
    expect(typeof result.current.displayLovelaces).toBe('function');
    expect(result.current.displayLovelaces(1_000_000)).toMatch(/ADA$/);
  });

  // The distinction that matters: a pool paying the best rate today can rank
  // BELOW one that pays less, and the default must follow the ranking.
  it('prefers the ranking over the current rate when the two disagree', () => {
    mockUseSearchStakePools.mockReturnValue({
      pools: [
        { ...poolA, ros: 0.09, recommendation: 1 },
        { ...poolB, ros: 0.01, recommendation: 5 },
      ],
      isLoading: false,
      totalPoolsCount: 2,
    });
    const { result } = renderHook(() => useBrowsePool({ accountId: 'acc-1' }));

    expect(result.current.data.map(pool => pool.poolId)).toEqual([
      poolB.poolId,
      poolA.poolId,
    ]);
  });

  // Both figures are optional on the UI shape: a pool without one must sink to
  // the end of a best-first list, never poison the comparison with NaN.
  it('sinks pools with no ranking score to the end of the default order', () => {
    mockUseSearchStakePools.mockReturnValue({
      pools: [
        // Deliberately WITHOUT a score — the case the sorter must survive —
        // which the state type forbids, hence the cast.
        poolA as never,
        { ...poolB, ros: 0.01, recommendation: 1 },
      ],
      isLoading: false,
      totalPoolsCount: 2,
    });
    const { result } = renderHook(() =>
      useBrowsePool({
        accountId: 'acc-1',
      }),
    );

    expect(result.current.data.map(pool => pool.poolId)).toEqual([
      poolB.poolId,
      poolA.poolId,
    ]);
  });

  // "Rate unknown" is not "rate below every other pool": ascending must not
  // float the unknowns to the top of a worst-first list.
  it('keeps unknown-rate pools at the end when sorting by rate ascending', () => {
    mockUseSearchStakePools.mockReturnValue({
      pools: [
        poolA as never,
        { ...poolB, ros: 0.035, recommendation: 1 },
        { ...poolC, ros: 0.01, recommendation: 2 },
      ],
      isLoading: false,
      totalPoolsCount: 3,
    });
    const { result } = renderHook(() =>
      useBrowsePool({
        accountId: 'acc-1',
        browsePoolSortOption: 'ros',
        browsePoolSortOrder: 'asc',
      }),
    );

    expect(result.current.data.map(pool => pool.poolId)).toEqual([
      poolC.poolId,
      poolB.poolId,
      poolA.poolId,
    ]);
    expect(result.current.hasActiveFilters).toBe(true);
  });

  // The filter sheet round-trips the defaulted option as an explicit param, so
  // applying it unchanged must not light the active-filters indicator: the
  // list is identical to the default.
  it('does not report an active filter for an explicit re-pick of the default order', () => {
    const { result } = renderHook(() =>
      useBrowsePool({
        accountId: 'acc-1',
        browsePoolSortOption: 'ranking',
        browsePoolSortOrder: 'desc',
      }),
    );

    expect(result.current.cardVariant).toBe('ranking');
    expect(result.current.hasActiveFilters).toBe(false);
  });

  // Choosing the rate IS an active filter now that it is no longer the default.
  it('reports an active filter when the user sorts by estimated rate', () => {
    const { result } = renderHook(() =>
      useBrowsePool({
        accountId: 'acc-1',
        browsePoolSortOption: 'ros',
        browsePoolSortOrder: 'desc',
      }),
    );

    expect(result.current.cardVariant).toBe('ros');
    expect(result.current.hasActiveFilters).toBe(true);
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

  /**
   * A pool with no metadata renders as "??" — the delegator cannot tell what it
   * is, so it belongs at the bottom however the list is sorted. Absent and
   * invalid metadata are the same case here: a failed fetch or a rejected
   * hash reaches us as blank fields.
   */
  describe('pools without metadata', () => {
    const anonymous = { ...poolC, ticker: null };

    it('sorts below identifiable pools on the recommended order', () => {
      mockUseSearchStakePools.mockReturnValue({
        pools: [
          // Highest score of the three, and still last: unreadable.
          { ...anonymous, ros: 0.05, recommendation: 9 },
          { ...poolA, ros: 0.02, recommendation: 1 },
          { ...poolB, ros: 0.03, recommendation: 2 },
        ],
        isLoading: false,
        totalPoolsCount: 3,
      });
      const { result } = renderHook(() =>
        useBrowsePool({ accountId: 'acc-1' }),
      );

      expect(result.current.data.map(pool => pool.poolId)).toEqual([
        poolB.poolId,
        poolA.poolId,
        anonymous.poolId,
      ]);
    });

    // The direction flip is the case a naive tie-break gets wrong: sinking them
    // must not mean "treat as worst", which ascending would float to the top.
    it('stays last when the order is reversed', () => {
      mockUseSearchStakePools.mockReturnValue({
        pools: [
          { ...anonymous, ros: 0.05, recommendation: 9 },
          { ...poolA, ros: 0.02, recommendation: 1 },
          { ...poolB, ros: 0.03, recommendation: 2 },
        ],
        isLoading: false,
        totalPoolsCount: 3,
      });
      const { result } = renderHook(() =>
        useBrowsePool({
          accountId: 'acc-1',
          browsePoolSortOption: 'ros',
          browsePoolSortOrder: 'asc',
        }),
      );

      expect(result.current.data.map(pool => pool.poolId)).toEqual([
        poolA.poolId,
        poolB.poolId,
        anonymous.poolId,
      ]);
    });

    it('treats a blank ticker as no metadata', () => {
      mockUseSearchStakePools.mockReturnValue({
        pools: [
          { ...poolC, ticker: '   ', ros: 0.05, recommendation: 9 },
          { ...poolA, ros: 0.02, recommendation: 1 },
        ],
        isLoading: false,
        totalPoolsCount: 2,
      });
      const { result } = renderHook(() =>
        useBrowsePool({ accountId: 'acc-1' }),
      );

      expect(result.current.data[0].poolId).toBe(poolA.poolId);
    });
  });

  it('uses tADA in displayLovelaces when network is testnet', () => {
    mockUseLaceSelector.mockImplementation((selector: string) => {
      if (selector === 'network.selectNetworkType') return 'testnet';
      if (selector === 'cardanoContext.selectTip') return undefined;
      if (selector === 'cardanoContext.selectEraSummaries') return undefined;
      if (selector === 'cardanoStakePools.selectActiveNetworkData') return null;
      if (selector === 'cardanoContext.selectRewardAccountDetails') return {};
      // Read only in selection mode, to decide whether the notice
      // mentions the vote delegation riding along.
      if (selector === 'features.selectLoadedFeatures')
        return { featureFlags: [] };
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
      // Read only in selection mode, to decide whether the notice
      // mentions the vote delegation riding along.
      if (selector === 'features.selectLoadedFeatures')
        return { featureFlags: [] };
      return undefined;
    });

    const { result } = renderHook(() => useBrowsePool({ accountId: 'acc-1' }));

    expect(result.current.data).toEqual([
      { ...poolB, ros: 0.035, recommendation: 2 },
    ]);
  });

  /**
   * The browsing exclusion must not apply to a PICK: the selection may be
   * spent on a different account — the migration passes its picked destination
   * while funds land on a new one — so the passed account's own pool is a
   * legitimate, often the intended, choice. Hiding it made the pool the user
   * already trusts the one pool they could not pick.
   */
  it("keeps the account's current pool listed in selection mode", () => {
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
      if (selector === 'features.selectLoadedFeatures')
        return { featureFlags: [] };
      return undefined;
    });

    const { result } = renderHook(() =>
      useBrowsePool({
        accountId: 'acc-1',
        poolSelectionId: 'migrate-wallet',
        poolSelectionNotice: 'stake-and-vote',
      }),
    );

    expect(
      result.current.data.map(pool => (pool as { poolId: string }).poolId),
    ).toContain(poolA.poolId);
  });

  // The list becomes another flow's pick step, so it has to say what picking
  // does — nothing else on screen explains why the user is looking at pools.
  describe('selection mode', () => {
    it('is off, with no notice, when browsing normally', () => {
      const { result } = renderHook(() =>
        useBrowsePool({ accountId: 'acc-1' }),
      );

      expect(result.current.isSelecting).toBe(false);
      expect(result.current.notice).toBeUndefined();
    });

    /**
     * The SENDING FLOW says what its transaction does; this screen only renders
     * it. Deriving it here from an earn-rewards target would bake one
     * consumer's semantics into a shared surface, and a third flow carrying no
     * vote certificate would promise a vote delegation that never happens.
     */
    it('states the pick and the vote delegation riding with it', () => {
      const { result } = renderHook(() =>
        useBrowsePool({
          accountId: 'acc-1',
          poolSelectionId: 'earn-rewards:acc-1',
          poolSelectionNotice: 'stake-and-vote',
        }),
      );

      expect(result.current.isSelecting).toBe(true);
      expect(result.current.notice).toBe(
        'v2.pages.browse-pool.select-notice-with-vote',
      );
    });

    // A consumer whose transaction carries no vote certificate. Promising one
    // would be a false financial disclosure on a shared screen.
    it('omits the vote sentence when the sender says stake only', () => {
      const { result } = renderHook(() =>
        useBrowsePool({
          accountId: 'acc-1',
          poolSelectionId: 'migrate-wallet',
          poolSelectionNotice: 'stake',
        }),
      );

      expect(result.current.notice).toBe('v2.pages.browse-pool.select-notice');
    });
  });
});
