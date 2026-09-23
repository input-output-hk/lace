import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchRPoints } from '../src/realfi-points';

import type { IPointsBalance } from '@realfi-co/realfi-partner-sdk';

const getPointsBalance = vi.fn<(address: string) => Promise<IPointsBalance>>();
const forNetwork = vi.fn((_network: string) => ({ getPointsBalance }));

vi.mock('@realfi-co/realfi-partner-sdk', () => ({
  RealfiApi: { forNetwork: (network: string) => forNetwork(network) },
}));

const ADDRESS = 'addr_test1qzexample';

describe('fetchRPoints', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("reads the wallet's settled balance via the SDK client for the config's network", async () => {
    getPointsBalance.mockResolvedValueOnce({
      pointsBalance: 4120,
      potentialPoints: 6000,
      multiplier: 1.5,
    });
    expect(await fetchRPoints({ realfiNetwork: 'preview' }, ADDRESS)).toEqual({
      totalPoints: 4120,
    });
    expect(forNetwork).toHaveBeenCalledWith('preview');
    expect(getPointsBalance).toHaveBeenCalledWith(ADDRESS);
  });

  it("falls back to RealFi's provisional figure before the season finalises", async () => {
    getPointsBalance.mockResolvedValueOnce({
      pointsBalance: null,
      potentialPoints: 6000,
      multiplier: null,
    });
    expect(await fetchRPoints({ realfiNetwork: 'preprod' }, ADDRESS)).toEqual({
      totalPoints: 6000,
    });
  });

  it('maps an engine-unknown wallet (all-null balance) to an honest 0', async () => {
    getPointsBalance.mockResolvedValueOnce({
      pointsBalance: null,
      potentialPoints: null,
      multiplier: null,
    });
    expect(await fetchRPoints({ realfiNetwork: 'preprod' }, ADDRESS)).toEqual({
      totalPoints: 0,
    });
  });

  it('propagates transport failures for the provider retry pipeline', async () => {
    getPointsBalance.mockRejectedValueOnce(new Error('boom'));
    await expect(
      fetchRPoints({ realfiNetwork: 'preview' }, ADDRESS),
    ).rejects.toThrow('boom');
  });
});
