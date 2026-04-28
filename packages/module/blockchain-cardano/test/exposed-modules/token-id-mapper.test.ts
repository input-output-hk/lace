import { CardanoTokenPriceId } from '@lace-contract/token-pricing';
import { TokenId } from '@lace-contract/tokens';
import { BigNumber } from '@lace-sdk/util';
import { describe, it, expect } from 'vitest';

import { createTokenIdMapper } from '../../src/exposed-modules/token-id-mapper';

import type { Address } from '@lace-contract/addresses';
import type { Token } from '@lace-contract/tokens';
import type { AccountId } from '@lace-contract/wallet-repo';

const createMockCardanoToken = (
  tokenId: string,
  ticker?: string,
  name?: string,
): Token => ({
  tokenId: TokenId(tokenId),
  blockchainName: 'Cardano',
  accountId: 'test-account' as AccountId,
  address: 'test-address' as Address,
  available: BigNumber(1000n),
  pending: BigNumber(0n),
  decimals: 6,
  displayLongName: name ?? `${tokenId} Token`,
  displayShortName: ticker ?? tokenId.toUpperCase(),
  metadata:
    ticker || name
      ? {
          ticker,
          name,
          decimals: 6,
          blockchainSpecific: {},
        }
      : undefined,
});

describe('Cardano TokenIdMapper', () => {
  const mapper = createTokenIdMapper();

  describe('blockchainName', () => {
    it('should have correct blockchain name', () => {
      expect(mapper.blockchainName).toBe('Cardano');
    });
  });

  describe('getTokenPriceId', () => {
    it('should return price ID using ticker when available', () => {
      const token = createMockCardanoToken('some-policy-id', 'ADA', 'Cardano');
      const priceId = mapper.getTokenPriceId(token);
      expect(priceId).toBe(CardanoTokenPriceId('ADA'));
    });

    it('should return price ID using name when no ticker', () => {
      const token = createMockCardanoToken(
        'some-policy-id',
        undefined,
        'My Token',
      );
      const priceId = mapper.getTokenPriceId(token);
      expect(priceId).toBe(CardanoTokenPriceId('My Token'));
    });

    it('should return price ID using tokenId when no metadata', () => {
      const token = createMockCardanoToken('some-token-id');
      const priceId = mapper.getTokenPriceId(token);
      expect(priceId).toBe(CardanoTokenPriceId('some-token-id'));
    });
  });

  describe('getTokenPriceRequest', () => {
    it('should return complete price request', () => {
      const token = createMockCardanoToken('ada', 'ADA', 'Cardano');
      const request = mapper.getTokenPriceRequest(token, 'USD');

      expect(request).toEqual({
        priceId: CardanoTokenPriceId('ADA'),
        blockchain: 'Cardano',
        identifier: 'ADA',
        fiatCurrency: 'USD',
      });
    });

    it('should use correct identifier from token metadata', () => {
      const token = createMockCardanoToken(
        'hosky-policy',
        'HOSKY',
        'Hosky Token',
      );
      const request = mapper.getTokenPriceRequest(token, 'EUR');

      expect(request).toEqual({
        priceId: CardanoTokenPriceId('HOSKY'),
        blockchain: 'Cardano',
        identifier: 'HOSKY',
        fiatCurrency: 'EUR',
      });
    });

    it('should use tokenId when no metadata', () => {
      const token = createMockCardanoToken('unknown-token-id');
      const request = mapper.getTokenPriceRequest(token, 'USD');

      expect(request).toEqual({
        priceId: CardanoTokenPriceId('unknown-token-id'),
        blockchain: 'Cardano',
        identifier: 'unknown-token-id',
        fiatCurrency: 'USD',
      });
    });
  });
});
