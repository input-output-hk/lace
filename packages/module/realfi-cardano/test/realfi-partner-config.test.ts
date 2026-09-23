import { PREVIEW_REALFI_CONFIG } from '@lace-contract/realfi-staking';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchSwapCounterpartAssets,
  filterBuildableStakeInputs,
} from '../src/realfi-partner-config';

const USDR_DOTTED = `${PREVIEW_REALFI_CONFIG.usdrPolicyId}.55534472`;
const ASSETS = [
  'ada.lovelace',
  'd8906ca5c7ba124a0407a32dab37b2c82b13b3dcd9111e42940dcea4.5553444378',
];

// Distinct URL per test defeats the module-level TTL cache without a reset hook.
const configFor = (name: string) => ({
  partnerConfigUrl: `https://preview.realfi.co/partner-config.json?${name}`,
  usdrPolicyId: PREVIEW_REALFI_CONFIG.usdrPolicyId,
});

const stubDocument = (document: unknown): ReturnType<typeof vi.fn> => {
  const fetchMock = vi.fn(
    async () =>
      ({ ok: true, status: 200, json: async () => document } as never),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

describe('fetchSwapCounterpartAssets', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_756_100_000_000);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('returns the validated live list', async () => {
    stubDocument({
      stablecoinAssetId: USDR_DOTTED,
      swapCounterpartAssets: ASSETS,
    });
    expect(await fetchSwapCounterpartAssets(configFor('valid'))).toEqual(
      ASSETS,
    );
  });

  it('serves the cached list within the TTL without a second fetch', async () => {
    const fetchMock = stubDocument({
      stablecoinAssetId: USDR_DOTTED,
      swapCounterpartAssets: ASSETS,
    });
    const config = configFor('cached');
    await fetchSwapCounterpartAssets(config);
    expect(await fetchSwapCounterpartAssets(config)).toEqual(ASSETS);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects a document whose stablecoin diverges from the compiled USDr (fallback, not half-trust)', async () => {
    stubDocument({
      stablecoinAssetId:
        '0000000000000000000000000000000000000000000000000000dead.55534472',
      swapCounterpartAssets: ASSETS,
    });
    expect(
      await fetchSwapCounterpartAssets(configFor('diverged')),
    ).toBeUndefined();
  });

  it('rejects malformed asset ids and failed reads', async () => {
    stubDocument({
      stablecoinAssetId: USDR_DOTTED,
      swapCounterpartAssets: ['not-a-sundae-id'],
    });
    expect(
      await fetchSwapCounterpartAssets(configFor('malformed')),
    ).toBeUndefined();

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 503 } as never)),
    );
    expect(
      await fetchSwapCounterpartAssets(configFor('outage')),
    ).toBeUndefined();
  });
});

describe('filterBuildableStakeInputs', () => {
  const pool = (a: string, b: string) => ({
    assetA: { assetId: a },
    assetB: { assetId: b },
  });

  it('keeps only candidates a discovered USDr pool pairs, preserving order', () => {
    const pools = [
      pool('ada.lovelace', USDR_DOTTED),
      pool(USDR_DOTTED, 'policy1.5553444d'),
    ];
    expect(
      filterBuildableStakeInputs(
        ['ada.lovelace', 'policy1.5553444d', 'policy2.5553444378'],
        pools,
      ),
    ).toEqual(['ada.lovelace', 'policy1.5553444d']);
  });

  it('drops everything when discovery returned no pools', () => {
    expect(filterBuildableStakeInputs(['ada.lovelace'], [])).toEqual([]);
  });
});
