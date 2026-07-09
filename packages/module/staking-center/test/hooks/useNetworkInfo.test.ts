/**
 * @vitest-environment jsdom
 */
import { Cardano } from '@cardano-sdk/core';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as hooksModule from '../../src/hooks';
import { useNetworkInfo } from '../../src/hooks/useNetworkInfo';

import type { EraSummary, Milliseconds } from '@cardano-sdk/core';

vi.mock('../../src/hooks', async importOriginal => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('../../src/hooks')>();
  return {
    ...actual,
    useLaceSelector: vi.fn(),
    useSearchStakePools: vi.fn(),
  };
});

vi.mock('@lace-lib/util-render', async importOriginal => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('@lace-lib/util-render')>();
  return {
    ...actual,
    formatEpochEnd: vi.fn(() => '01d 02h 03m'),
  };
});

const SLOT_LENGTH_MS = 1000;

const eraSummaries: EraSummary[] = [
  {
    start: { slot: 0, time: new Date(0) },
    parameters: {
      epochLength: 432_000,
      slotLength: SLOT_LENGTH_MS as Milliseconds,
    },
  },
];

const tip = { slot: Cardano.Slot(864_000) }; // slot 864000 → epoch 2

const networkData = {
  liveStake: 20_000_000_000_000,
  maxLovelaceSupply: 45_000_000_000_000_000,
  reserves: 20_000_000_000_000_000,
};

describe('useNetworkInfo', () => {
  const mockUseLaceSelector = vi.mocked(hooksModule.useLaceSelector);
  const mockUseSearchStakePools = vi.mocked(hooksModule.useSearchStakePools);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockUseLaceSelector.mockImplementation((selector: string) => {
      if (selector === 'cardanoContext.selectTip') return tip;
      if (selector === 'cardanoContext.selectEraSummaries') return eraSummaries;
      if (selector === 'cardanoStakePools.selectActiveNetworkData')
        return networkData;
      return undefined;
    });

    mockUseSearchStakePools.mockReturnValue({
      pools: [],
      isLoading: false,
      totalPoolsCount: 3142,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns currentEpochValue derived from tip slot', () => {
    const { result } = renderHook(() => useNetworkInfo());
    expect(result.current.currentEpochValue).toBe('2');
  });

  it('returns totalPoolsValue from useSearchStakePools', () => {
    const { result } = renderHook(() => useNetworkInfo());
    expect(result.current.totalPoolsValue).toBe('3142');
  });

  it('returns stakedValue as formatted percentage', () => {
    const { result } = renderHook(() => useNetworkInfo());
    // circulating = 45_000_000_000_000_000 - 20_000_000_000_000_000 = 25_000_000_000_000_000
    // staked = 20_000_000_000_000 / 25_000_000_000_000_000 = 0.0008 = 0.08%
    expect(result.current.stakedValue).toMatch(/%/);
  });

  it('returns endEpochValue from formatEpochEnd', () => {
    const { result } = renderHook(() => useNetworkInfo());
    expect(result.current.endEpochValue).toBe('01d 02h 03m');
  });

  it('returns undefined currentEpochValue when tip is undefined', () => {
    mockUseLaceSelector.mockImplementation((selector: string) => {
      if (selector === 'cardanoContext.selectTip') return undefined;
      if (selector === 'cardanoContext.selectEraSummaries') return eraSummaries;
      if (selector === 'cardanoStakePools.selectActiveNetworkData')
        return networkData;
      return undefined;
    });

    const { result } = renderHook(() => useNetworkInfo());
    expect(result.current.currentEpochValue).toBeUndefined();
  });

  it('returns undefined stakedValue when networkData is undefined', () => {
    mockUseLaceSelector.mockImplementation((selector: string) => {
      if (selector === 'cardanoContext.selectTip') return tip;
      if (selector === 'cardanoContext.selectEraSummaries') return eraSummaries;
      if (selector === 'cardanoStakePools.selectActiveNetworkData')
        return undefined;
      return undefined;
    });

    const { result } = renderHook(() => useNetworkInfo());
    expect(result.current.stakedValue).toBeUndefined();
  });
});
