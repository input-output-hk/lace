import { CardanoTokenPriceId } from '@lace-contract/token-pricing';
import { TokenId } from '@lace-contract/tokens';
import { BigNumber } from '@lace-lib/util';
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
    it('derives the price ID from the AssetId, ignoring the ticker', () => {
      const token = createMockCardanoToken('some-policy-id', 'ADA', 'Cardano');
      const priceId = mapper.getTokenPriceId(token);
      expect(priceId).toBe(CardanoTokenPriceId('some-policy-id'));
    });

    it('uses the lovelace tokenId for native ADA', () => {
      const token = createMockCardanoToken('lovelace', 'ADA', 'Cardano');
      const priceId = mapper.getTokenPriceId(token);
      expect(priceId).toBe(CardanoTokenPriceId('lovelace'));
    });

    it('derives from the tokenId when no metadata', () => {
      const token = createMockCardanoToken('some-token-id');
      const priceId = mapper.getTokenPriceId(token);
      expect(priceId).toBe(CardanoTokenPriceId('some-token-id'));
    });
  });

  describe('getTokenPriceRequest', () => {
    it('should not set a contract address for native ADA (lovelace)', () => {
      const token = createMockCardanoToken('lovelace', 'ADA', 'Cardano');
      const request = mapper.getTokenPriceRequest(token, 'USD');

      expect(request).toEqual({
        priceId: CardanoTokenPriceId('lovelace'),
        blockchain: 'Cardano',
        identifier: 'ADA',
        contractAddress: undefined,
        fiatCurrency: 'USD',
      });
    });

    it('should set the AssetId as contract address for native tokens', () => {
      const token = createMockCardanoToken(
        'hosky-policy',
        'HOSKY',
        'Hosky Token',
      );
      const request = mapper.getTokenPriceRequest(token, 'EUR');

      expect(request).toEqual({
        priceId: CardanoTokenPriceId('hosky-policy'),
        blockchain: 'Cardano',
        identifier: 'HOSKY',
        contractAddress: 'hosky-policy',
        fiatCurrency: 'EUR',
      });
    });

    it('should disambiguate tokens sharing a ticker by their AssetId', () => {
      const dipA = createMockCardanoToken('policy-a-444950', 'DIP', 'DIP A');
      const dipB = createMockCardanoToken('policy-b-444950', 'DIP', 'DIP B');

      const requestA = mapper.getTokenPriceRequest(dipA, 'USD');
      const requestB = mapper.getTokenPriceRequest(dipB, 'USD');

      expect(requestA.identifier).toBe(requestB.identifier);
      expect(requestA.priceId).not.toBe(requestB.priceId);
      expect(requestA.contractAddress).toBe('policy-a-444950');
      expect(requestB.contractAddress).toBe('policy-b-444950');
    });

    it('should use tokenId when no metadata', () => {
      const token = createMockCardanoToken('unknown-token-id');
      const request = mapper.getTokenPriceRequest(token, 'USD');

      expect(request).toEqual({
        priceId: CardanoTokenPriceId('unknown-token-id'),
        blockchain: 'Cardano',
        identifier: 'unknown-token-id',
        contractAddress: 'unknown-token-id',
        fiatCurrency: 'USD',
      });
    });
  });
});
