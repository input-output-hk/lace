import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchVaultRate,
  setCachedEarnedUsdPerSusdr,
  setCachedPendingUnstakeBaseUnits,
  setCachedYieldInfoByNetwork,
  subscribeToCardDataChanges,
} from '../src/realfi-yield';

const API_URL = 'https://api.preview.realfi.co/graphql';
const NOW_MS = 1_756_100_000_000;

const stubInputs = (
  inputs: Record<string, string> | null,
): ReturnType<typeof vi.fn> => {
  const fetchMock = vi.fn(
    async () =>
      ({
        ok: true,
        status: 200,
        json: async () => ({ data: { susdrExchangeRateInputs: inputs } }),
      } as never),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

describe('fetchVaultRate (diffusion-aware settled rate)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW_MS);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('rates over the full balance when no yield is pending', async () => {
    stubInputs({
      circulatingSusdr: '1000000',
      vaultUsdr: '1133700',
      pendingYield: '0',
      diffusionStartUnixMilli: '0',
      diffusionEndUnixMilli: '0',
    });
    expect(await fetchVaultRate(API_URL)).toBe(1.1337);
  });

  it('excludes the full pending yield before the diffusion window opens', async () => {
    stubInputs({
      circulatingSusdr: '1000000',
      vaultUsdr: '1200000',
      pendingYield: '200000',
      diffusionStartUnixMilli: String(NOW_MS + 1000),
      diffusionEndUnixMilli: String(NOW_MS + 11_000),
    });
    // Settled backing = 1_200_000 − 200_000 → rate 1.0.
    expect(await fetchVaultRate(API_URL)).toBe(1);
  });

  it('releases the pending yield linearly through the window (remainder rounded up)', async () => {
    stubInputs({
      circulatingSusdr: '1000000',
      vaultUsdr: '1200000',
      pendingYield: '200000',
      diffusionStartUnixMilli: String(NOW_MS - 5000),
      diffusionEndUnixMilli: String(NOW_MS + 5000),
    });
    // Half the window elapsed → 100_000 still pending → rate 1.1.
    expect(await fetchVaultRate(API_URL)).toBe(1.1);
  });

  it('rates over the full balance once the window has elapsed', async () => {
    stubInputs({
      circulatingSusdr: '1000000',
      vaultUsdr: '1200000',
      pendingYield: '200000',
      diffusionStartUnixMilli: String(NOW_MS - 11_000),
      diffusionEndUnixMilli: String(NOW_MS - 1000),
    });
    expect(await fetchVaultRate(API_URL)).toBe(1.2);
  });

  it('reports 1:1 when no sUSDr circulates (on-chain convention)', async () => {
    stubInputs({
      circulatingSusdr: '0',
      vaultUsdr: '5000000',
      pendingYield: '0',
      diffusionStartUnixMilli: '0',
      diffusionEndUnixMilli: '0',
    });
    expect(await fetchVaultRate(API_URL)).toBe(1);
  });

  it('returns undefined on a missing or malformed read (no fabricated rate)', async () => {
    stubInputs(null);
    expect(await fetchVaultRate(API_URL)).toBeUndefined();

    stubInputs({
      circulatingSusdr: 'not-a-number',
      vaultUsdr: '1000000',
      pendingYield: '0',
      diffusionStartUnixMilli: '0',
      diffusionEndUnixMilli: '0',
    });
    expect(await fetchVaultRate(API_URL)).toBeUndefined();
  });
});

describe('card-data cache subscription', () => {
  it('notifies on every cache write and stops after unsubscribe', () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeToCardDataChanges(onChange);

    setCachedPendingUnstakeBaseUnits('5000000');
    setCachedEarnedUsdPerSusdr({});
    setCachedYieldInfoByNetwork({});
    expect(onChange).toHaveBeenCalledTimes(3);

    unsubscribe();
    setCachedPendingUnstakeBaseUnits('0');
    expect(onChange).toHaveBeenCalledTimes(3);
  });
});
