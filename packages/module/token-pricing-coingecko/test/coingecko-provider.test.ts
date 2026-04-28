import { CardanoTokenPriceId } from '@lace-contract/token-pricing';
import { firstValueFrom } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { CoinGeckoProvider } from '../src/coingecko-provider';

import type { TokenPriceRequest } from '@lace-contract/token-pricing';
import type { BlockchainName } from '@lace-lib/util-store';

describe('CoinGeckoProvider', () => {
  let provider: CoinGeckoProvider;
  let fetchMock: ReturnType<typeof vi.fn>;
  const testBaseUrl = 'https://test.coingecko.io/api/v3';

  const mockCoinsList = [
    { id: 'cardano', symbol: 'ada', name: 'Cardano', platforms: {} },
    { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', platforms: {} },
    { id: 'ethereum', symbol: 'eth', name: 'Ethereum', platforms: {} },
    {
      id: 'usd-coin',
      symbol: 'usdc',
      name: 'USDC',
      platforms: {
        ethereum: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        cardano:
          '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff19855534443',
      },
    },
  ];

  const createRequest = (
    identifier: string,
    blockchain = 'Cardano',
    fiatCurrency = 'USD',
  ): TokenPriceRequest => ({
    priceId: CardanoTokenPriceId(identifier),
    blockchain: blockchain as BlockchainName,
    identifier,
    fiatCurrency,
  });

  const mockFetchResponse = (data: unknown, ok = true, status = 200) => {
    fetchMock.mockResolvedValueOnce({
      ok,
      status,
      json: async () => data,
    });
  };

  beforeEach(() => {
    provider = new CoinGeckoProvider(testBaseUrl, dummyLogger);
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchPrices', () => {
    it('should return empty array for empty requests', async () => {
      const result = await firstValueFrom(provider.fetchPrices([]));
      expect(result).toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should return empty array for unmapped tokens', async () => {
      mockFetchResponse(mockCoinsList);

      const result = await firstValueFrom(
        provider.fetchPrices([createRequest('unknown')]),
      );
      expect(result).toEqual([]);
      expect(fetchMock).toHaveBeenCalledWith(
        `${testBaseUrl}/coins/list?include_platform=true`,
      );
    });

    it('should fetch prices for ADA by symbol match', async () => {
      mockFetchResponse(mockCoinsList);
      mockFetchResponse({ cardano: { usd: 0.5, usd_24h_change: 2.5 } });

      const request = createRequest('ada');
      const result = await firstValueFrom(provider.fetchPrices([request]));

      expect(result[0]).toMatchObject({
        priceId: request.priceId,
        price: 0.5,
        change24h: 2.5,
      });
    });

    it('should request prices using request fiat currency', async () => {
      mockFetchResponse(mockCoinsList);
      mockFetchResponse({ cardano: { eur: 0.45, eur_24h_change: 1.2 } });

      await firstValueFrom(
        provider.fetchPrices([createRequest('ada', 'Cardano', 'EUR')]),
      );

      const priceCall = fetchMock.mock.calls.find((call: unknown[]) =>
        (call[0] as string).includes('/simple/price'),
      )?.[0] as string;

      expect(priceCall).toContain('vs_currencies=eur');
    });

    it('should throw errors for API failures and rate limiting', async () => {
      for (const status of [500, 429]) {
        provider = new CoinGeckoProvider(testBaseUrl); // Reset cache for fresh run
        mockFetchResponse(mockCoinsList);
        mockFetchResponse({}, false, status);

        await expect(
          firstValueFrom(provider.fetchPrices([createRequest('ada')])),
        ).rejects.toThrow();
      }
    });

    it('should cache coins list and not refetch on subsequent calls', async () => {
      mockFetchResponse(mockCoinsList);
      mockFetchResponse({ cardano: { usd: 0.5, usd_24h_change: 2.5 } });
      mockFetchResponse({ bitcoin: { usd: 45000, usd_24h_change: 3.1 } });

      await firstValueFrom(provider.fetchPrices([createRequest('ada')]));
      await firstValueFrom(
        provider.fetchPrices([createRequest('btc', 'Bitcoin')]),
      );

      const listCalls = fetchMock.mock.calls.filter((call: unknown[]) =>
        (call[0] as string).includes('/coins/list'),
      );
      expect(listCalls).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('should match tokens by blockchain availability and prefer specific matches', async () => {
      const mockMultiChain = [
        ...mockCoinsList,
        {
          id: 'usdc-eth-only',
          symbol: 'usdc',
          name: 'USDC (Eth)',
          platforms: { ethereum: '0x...' },
        },
      ];

      mockFetchResponse(mockMultiChain);
      mockFetchResponse({ 'usd-coin': { usd: 1.0, usd_24h_change: 0.01 } }); // Individual fetch for usd-coin

      const request = createRequest('usdc');
      await firstValueFrom(provider.fetchPrices([request]));

      const priceCall = fetchMock.mock.calls.find((call: unknown[]) =>
        (call[0] as string).includes('/simple/price'),
      )?.[0] as string;
      expect(priceCall).toContain('ids=usd-coin'); // The one with Cardano platform
    });

    it('should fetch each token individually for better proxy caching', async () => {
      mockFetchResponse(mockCoinsList);
      mockFetchResponse({ cardano: { usd: 0.5, usd_24h_change: 2.5 } });
      mockFetchResponse({ bitcoin: { usd: 45000, usd_24h_change: 3.1 } });
      mockFetchResponse({ ethereum: { usd: 3000, usd_24h_change: 1.5 } });

      // Request multiple tokens at once
      await firstValueFrom(
        provider.fetchPrices([
          createRequest('ada'),
          createRequest('btc', 'Bitcoin'),
          createRequest('eth', 'Ethereum'),
        ]),
      );

      // Verify that each token was fetched with its own URL
      const priceCalls = fetchMock.mock.calls.filter((call: unknown[]) =>
        (call[0] as string).includes('/simple/price'),
      );

      expect(priceCalls).toHaveLength(3);
      expect(priceCalls[0]?.[0]).toContain('ids=cardano');
      expect(priceCalls[0]?.[0]).not.toContain(',');
      expect(priceCalls[1]?.[0]).toContain('ids=bitcoin');
      expect(priceCalls[1]?.[0]).not.toContain(',');
    });
  });

  describe('fetchPriceHistory', () => {
    it('should return empty array for empty requests', async () => {
      const result = await firstValueFrom(provider.fetchPriceHistory([]));

      expect(result).toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should fetch price history for multiple tokens', async () => {
      mockFetchResponse(mockCoinsList);
      mockFetchResponse({
        cardano: {
          prices: [[1704000000000, 0.5]],
        },
        bitcoin: {
          prices: [[1704000000000, 45000]],
        },
      });

      const result = await firstValueFrom(
        provider.fetchPriceHistory([
          {
            priceId: CardanoTokenPriceId('ada'),
            blockchain: 'Cardano',
            identifier: 'ada',
            fiatCurrency: 'USD',
          },
          {
            priceId: CardanoTokenPriceId('btc'),
            blockchain: 'Bitcoin',
            identifier: 'btc',
            fiatCurrency: 'USD',
          },
        ]),
      );

      expect(result).toHaveLength(2);
      expect(result[0]?.priceId).toBe(CardanoTokenPriceId('ada'));
      expect(result[1]?.priceId).toBe(CardanoTokenPriceId('btc'));
    });

    it('should return empty data for unmapped tokens', async () => {
      mockFetchResponse(mockCoinsList);

      const result = await firstValueFrom(
        provider.fetchPriceHistory([
          {
            priceId: CardanoTokenPriceId('unknown'),
            blockchain: 'Cardano',
            identifier: 'unknown',
            fiatCurrency: 'USD',
          },
        ]),
      );

      expect(result).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      mockFetchResponse(mockCoinsList);
      mockFetchResponse({}, false, 500);

      const result = await firstValueFrom(
        provider.fetchPriceHistory([
          {
            priceId: CardanoTokenPriceId('ada'),
            blockchain: 'Cardano',
            identifier: 'ada',
            fiatCurrency: 'USD',
          },
        ]),
      );

      // Should return empty data on error, not throw
      expect(result).toHaveLength(1);
      expect(result[0]?.data).toEqual([]);
    });
  });
});
