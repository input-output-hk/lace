import { BitcoinTokenPriceId } from '@lace-contract/token-pricing';
import { TokenId } from '@lace-contract/tokens';
import { BigNumber } from '@lace-sdk/util';
import { describe, it, expect } from 'vitest';

import { createTokenIdMapper } from '../../src/exposed-modules/token-id-mapper';

import type { Address } from '@lace-contract/addresses';
import type { Token } from '@lace-contract/tokens';
import type { AccountId } from '@lace-contract/wallet-repo';

const createMockBitcoinToken = (): Token => ({
  tokenId: TokenId('btc'),
  blockchainName: 'Bitcoin',
  accountId: 'test-account' as AccountId,
  address: 'test-address' as Address,
  available: BigNumber(100000000n), // 1 BTC in satoshis
  pending: BigNumber(0n),
  decimals: 8,
  displayLongName: 'Bitcoin',
  displayShortName: 'BTC',
  metadata: {
    ticker: 'BTC',
    name: 'Bitcoin',
    decimals: 8,
    blockchainSpecific: {},
  },
});

describe('Bitcoin TokenIdMapper', () => {
  const mapper = createTokenIdMapper();

  describe('blockchainName', () => {
    it('should have correct blockchain name', () => {
      expect(mapper.blockchainName).toBe('Bitcoin');
    });
  });

  describe('getTokenPriceId', () => {
    it('should return BitcoinTokenPriceId for any Bitcoin token', () => {
      const token = createMockBitcoinToken();
      const priceId = mapper.getTokenPriceId(token);
      expect(priceId).toBe(BitcoinTokenPriceId('btc'));
      expect(priceId).toBe('bitcoin:btc');
    });
  });

  describe('getTokenPriceRequest', () => {
    it('should return complete price request for Bitcoin', () => {
      const token = createMockBitcoinToken();
      const request = mapper.getTokenPriceRequest(token, 'USD');

      expect(request).toEqual({
        priceId: BitcoinTokenPriceId('btc'),
        blockchain: 'Bitcoin',
        identifier: 'BTC',
        fiatCurrency: 'USD',
      });
    });

    it('should work with different fiat currencies', () => {
      const token = createMockBitcoinToken();
      const request = mapper.getTokenPriceRequest(token, 'EUR');

      expect(request).toEqual({
        priceId: BitcoinTokenPriceId('btc'),
        blockchain: 'Bitcoin',
        identifier: 'BTC',
        fiatCurrency: 'EUR',
      });
    });
  });
});
