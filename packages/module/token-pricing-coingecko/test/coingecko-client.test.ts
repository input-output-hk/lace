import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { coingeckoClient } from '../src/coingecko-client';

describe('coingeckoClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const testBaseUrl = 'https://test.coingecko.io/api/v3';

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchTokenPrices', () => {
    it('should return empty map for empty IDs', async () => {
      const result = await coingeckoClient.fetchTokenPrices(testBaseUrl, []);
      expect(result.size).toBe(0);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should fetch prices for multiple tokens', async () => {
      // Mock individual fetch calls for each token
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          cardano: {
            usd: 0.5,
            usd_24h_change: 2.5,
          },
        }),
      });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          minswap: {
            usd: 0.02,
            usd_24h_change: -1.2,
          },
        }),
      });

      const result = await coingeckoClient.fetchTokenPrices(testBaseUrl, [
        'cardano',
        'minswap',
      ]);

      expect(result.size).toBe(2);
      expect(result.get('cardano')).toEqual({
        price: 0.5,
        change24h: 2.5,
      });
      expect(result.get('minswap')).toEqual({
        price: 0.02,
        change24h: -1.2,
      });
      // Verify each token was fetched individually
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should throw on rate limit error', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 429,
      });

      return expect(
        coingeckoClient.fetchTokenPrices(testBaseUrl, ['cardano']),
      ).rejects.toThrow('CoinGecko rate limit exceeded');
    });

    it('should throw on other API errors', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      return expect(
        coingeckoClient.fetchTokenPrices(testBaseUrl, ['cardano']),
      ).rejects.toThrow('CoinGecko API error: 500');
    });

    it('should handle EUR currency', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          cardano: {
            eur: 0.45,
            eur_24h_change: 1.8,
          },
        }),
      });

      const result = await coingeckoClient.fetchTokenPrices(
        testBaseUrl,
        ['cardano'],
        'EUR',
      );

      expect(result.get('cardano')).toEqual({
        price: 0.45,
        change24h: 1.8,
      });
    });

    it('should exclude tokens with missing price data', async () => {
      // Mock individual fetch calls for each token
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          cardano: {
            usd: 0.5,
            usd_24h_change: 2.5,
          },
        }),
      });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          minswap: {
            // Missing usd price data
            usd_24h_change: -1.2,
          },
        }),
      });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sundaeswap: {
            usd: 0.03,
            usd_24h_change: 5.0,
          },
        }),
      });

      const result = await coingeckoClient.fetchTokenPrices(testBaseUrl, [
        'cardano',
        'minswap',
        'sundaeswap',
      ]);

      expect(result.size).toBe(2);
      expect(result.get('cardano')).toEqual({
        price: 0.5,
        change24h: 2.5,
      });
      expect(result.get('minswap')).toBeUndefined();
      expect(result.get('sundaeswap')).toEqual({
        price: 0.03,
        change24h: 5.0,
      });
      // Verify each token was fetched individually
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('should fetch each token with individual URLs for better proxy caching', async () => {
      // Mock individual fetch calls
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          cardano: { usd: 0.5, usd_24h_change: 2.5 },
        }),
      });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          bitcoin: { usd: 45000, usd_24h_change: 3.1 },
        }),
      });

      await coingeckoClient.fetchTokenPrices(testBaseUrl, [
        'cardano',
        'bitcoin',
      ]);

      // Verify each token was fetched with its own URL (no commas in ids parameter)
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const call1 = fetchMock.mock.calls[0]?.[0] as string;
      const call2 = fetchMock.mock.calls[1]?.[0] as string;

      expect(call1).toContain('ids=cardano');
      expect(call1).not.toContain(','); // No comma means single token
      expect(call2).toContain('ids=bitcoin');
      expect(call2).not.toContain(',');
    });
  });

  describe('fetchPriceHistory', () => {
    beforeEach(() => {
      vi.spyOn(Date, 'now').mockReturnValue(1704067200000); // 2024-01-01 00:00:00
    });

    it('should return empty map for empty array', async () => {
      const result = await coingeckoClient.fetchPriceHistory({
        baseUrl: testBaseUrl,
        coinGeckoIds: [],
        currency: 'usd',
        timeRange: '24H',
      });

      expect(result.size).toBe(0);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should fetch price history for single token', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          prices: [
            [1704000000000, 0.5],
            [1704010000000, 0.52],
            [1704020000000, 0.51],
          ],
        }),
      });

      const result = await coingeckoClient.fetchPriceHistory({
        baseUrl: testBaseUrl,
        coinGeckoIds: ['cardano'],
        currency: 'usd',
        timeRange: '24H',
      });

      expect(result.size).toBe(1);
      const cardanoHistory = result.get('cardano');
      expect(cardanoHistory).toHaveLength(3);
      expect(cardanoHistory?.[0]).toMatchObject({
        timestamp: 1704000000000,
        price: 0.5,
      });
      expect(cardanoHistory?.[1]).toMatchObject({
        timestamp: 1704010000000,
        price: 0.52,
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should fetch price history for multiple tokens in parallel', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          prices: [
            [1704000000000, 0.5],
            [1704010000000, 0.52],
          ],
        }),
      });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          prices: [
            [1704000000000, 0.02],
            [1704010000000, 0.021],
          ],
        }),
      });

      const result = await coingeckoClient.fetchPriceHistory({
        baseUrl: testBaseUrl,
        coinGeckoIds: ['cardano', 'minswap'],
        currency: 'usd',
        timeRange: '24H',
      });

      expect(result.size).toBe(2);
      expect(result.get('cardano')).toHaveLength(2);
      expect(result.get('minswap')).toHaveLength(2);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should throw if any parallel fetch fails', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          prices: [[1704000000000, 0.5]],
        }),
      });
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(
        coingeckoClient.fetchPriceHistory({
          baseUrl: testBaseUrl,
          coinGeckoIds: ['cardano', 'minswap'],
          currency: 'usd',
          timeRange: '24H',
        }),
      ).rejects.toThrow('CoinGecko API error: 500');

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should use correct time range parameters', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ prices: [] }),
      });

      await coingeckoClient.fetchPriceHistory({
        baseUrl: testBaseUrl,
        coinGeckoIds: ['cardano'],
        currency: 'usd',
        timeRange: '7D',
      });

      const callUrl = fetchMock.mock.calls[0]?.[0] as string;
      expect(callUrl).toContain('vs_currency=usd');
      expect(callUrl).toContain('from=');
      expect(callUrl).toContain('to=');
    });

    it('should format dates in MM/dd format', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          prices: [[1704067200000, 0.5]],
        }),
      });

      const result = await coingeckoClient.fetchPriceHistory({
        baseUrl: testBaseUrl,
        coinGeckoIds: ['cardano'],
        currency: 'usd',
        timeRange: '24H',
      });

      const cardanoHistory = result.get('cardano');
      expect(cardanoHistory?.[0]?.date).toBe('01/01');
    });
  });
});
