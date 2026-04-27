import { describe, expect, it } from 'vitest';

import {
  fromBuildResponse,
  fromDexList,
  fromEstimateResponse,
  fromTokenSummary,
  toBuildRequest,
  toEstimateRequest,
  toSwapProviderError,
} from '../../src/steelswap/steelswap-mappers';

import type { SteelSwapEstimateResponse } from '../../src/steelswap/steelswap-types';
import type { SwapQuoteRequest } from '@lace-contract/swap-provider';

const mockQuoteRequest: SwapQuoteRequest = {
  networkId: 'cardano',
  sellTokenId: 'lovelace',
  sellTokenDecimals: 6,
  buyTokenId: 'abc123def456',
  sellAmount: '10',
  slippage: 0.5,
  excludedDexes: ['SundaeSwap'],
  userAddress: 'addr_test1qz...',
};

const mockEstimateResponse: SteelSwapEstimateResponse = {
  tokenA: 'lovelace',
  quantityA: 10_000_000,
  tokenB: 'abc123def456',
  quantityB: 500,
  totalFee: 2_000_000,
  totalDeposit: 2_000_000,
  steelswapFee: 100_000,
  bonusOut: 0,
  price: 0.00005,
  pools: [
    {
      dex: 'Minswap',
      poolId: 'pool123',
      quantityA: 10_000_000,
      quantityB: 500,
      batcherFee: 2_000_000,
      deposit: 2_000_000,
      volumeFee: 30_000,
    },
  ],
};

describe('steelswap-mappers', () => {
  describe('toEstimateRequest', () => {
    it('maps SwapQuoteRequest to SteelSwap estimate request', () => {
      const result = toEstimateRequest(mockQuoteRequest);
      expect(result.tokenA).toBe('lovelace');
      expect(result.tokenB).toBe('abc123def456');
      expect(result.quantity).toBe(10_000_000);
      expect(result.ignoreDexes).toEqual(['SundaeSwap']);
      expect(result.partner).toBe('lace-aggregator');
      expect(result.hop).toBe(true);
      expect(result.da).toEqual([]);
    });
  });

  describe('fromEstimateResponse', () => {
    it('maps SteelSwap estimate response to SwapQuote', () => {
      const result = fromEstimateResponse(
        mockEstimateResponse,
        mockQuoteRequest,
      );
      expect(result.providerId).toBe('steelswap');
      expect(result.sellTokenId).toBe('lovelace');
      expect(result.buyTokenId).toBe('abc123def456');
      expect(result.expectedBuyAmount).toBe('500');
      expect(result.price).toBe(0.00005);
      expect(result.route).toHaveLength(1);
      expect(result.route[0].dexName).toBe('Minswap');
      expect(result.fees).toHaveLength(3);
      expect(result.fees[0].displayCurrency).toBe('ADA');
      expect(result.totalFeeDisplay).toBeDefined();
      expect(result.priceDisplay).toBeDefined();
    });

    it('omits deposit fee when totalDeposit is 0', () => {
      const noDeposit = { ...mockEstimateResponse, totalDeposit: 0 };
      const result = fromEstimateResponse(noDeposit, mockQuoteRequest);
      expect(result.fees).toHaveLength(2);
    });

    it('handles hop routes via splitGroup', () => {
      const hopResponse = {
        ...mockEstimateResponse,
        pools: undefined,
        splitGroup: [mockEstimateResponse.pools!],
      };
      const result = fromEstimateResponse(hopResponse, mockQuoteRequest);
      expect(result.route).toHaveLength(1);
    });
  });

  describe('toBuildRequest', () => {
    it('maps SwapBuildRequest to SteelSwap build request', () => {
      const quote = fromEstimateResponse(
        mockEstimateResponse,
        mockQuoteRequest,
      );
      const result = toBuildRequest({
        quote,
        slippage: 0.5,
        userAddress: 'addr_test1qz...',
        utxos: ['utxo1'],
        collateralUtxos: ['col1'],
        ttl: 900,
      });
      expect(result.tokenA).toBe('lovelace');
      expect(result.address).toBe('addr_test1qz...');
      expect(result.utxos).toEqual(['utxo1']);
      expect(result.collateral).toEqual(['col1']);
      expect(result.partner).toBe('lace-aggregator');
      expect(result.pAddress).toBe('$lace@steelswap');
      expect(result.feeAdust).toBe(true);
      expect(result.hop).toBe(true);
      expect(result.ttl).toBe(900);
    });
  });

  describe('fromBuildResponse', () => {
    it('maps SteelSwap build response to SwapTransaction', () => {
      const result = fromBuildResponse({ tx: 'deadbeef', p: true });
      expect(result.unsignedTxCbor).toBe('deadbeef');
      expect(result.providerId).toBe('steelswap');
    });
  });

  describe('fromTokenSummary', () => {
    const nftCdnUrl = 'https://nftcdn.lw.iog.io';

    it('maps SteelSwap token to SwapToken', () => {
      const result = fromTokenSummary(
        {
          ticker: 'MIN',
          name: 'Minswap',
          policyId: 'abc',
          policyName: 'def',
          decimals: 6,
        },
        nftCdnUrl,
      );
      expect(result.id).toBe('abcdef');
      expect(result.ticker).toBe('MIN');
      expect(result.decimals).toBe(6);
      // icon may be undefined if fingerprint construction fails with test policyIds
    });

    it('maps ADA token with lovelace id and no icon', () => {
      const result = fromTokenSummary(
        {
          ticker: 'ADA',
          name: 'Cardano',
          policyId: '',
          policyName: '',
          decimals: 6,
        },
        nftCdnUrl,
      );
      expect(result.id).toBe('lovelace');
      expect(result.icon).toBeUndefined();
    });
  });

  describe('fromDexList', () => {
    it('maps string array to SwapDex array', () => {
      const result = fromDexList(['Minswap', 'SundaeSwap']);
      expect(result).toEqual([
        { id: 'Minswap', name: 'Minswap' },
        { id: 'SundaeSwap', name: 'SundaeSwap' },
      ]);
    });
  });

  describe('toSwapProviderError', () => {
    it('maps Error to SwapProviderError', () => {
      const result = toSwapProviderError(new Error('timeout'));
      expect(result.code).toBe('PROVIDER_UNAVAILABLE');
      expect(result.message).toBe('timeout');
    });

    it('maps unknown error to UNKNOWN', () => {
      const result = toSwapProviderError('string error');
      expect(result.code).toBe('UNKNOWN');
      expect(result.message).toBe('string error');
    });
  });
});
