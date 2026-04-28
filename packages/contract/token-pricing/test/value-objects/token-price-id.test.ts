import { TokenId } from '@lace-contract/tokens';
import { describe, it, expect } from 'vitest';

import {
  TokenPriceId,
  CardanoTokenPriceId,
  BitcoinTokenPriceId,
} from '../../src/value-objects';

describe('TokenPriceId', () => {
  it('should create correct price ID for Cardano tokens', () => {
    const priceId = TokenPriceId('Cardano', 'ada');
    expect(priceId).toBe('cardano:ada');
  });

  it('should create correct price ID for Bitcoin', () => {
    const priceId = TokenPriceId('Bitcoin', 'btc');
    expect(priceId).toBe('bitcoin:btc');
  });

  it('should lowercase the identifier', () => {
    const priceId = TokenPriceId('Cardano', 'ADA');
    expect(priceId).toBe('cardano:ada');
  });
});

describe('CardanoTokenPriceId', () => {
  it('should create correct price ID for ADA', () => {
    const priceId = CardanoTokenPriceId(TokenId('ada'));
    expect(priceId).toBe('cardano:ada');
  });

  it('should create correct price ID for tokenId', () => {
    const priceId = CardanoTokenPriceId(TokenId('tokenId'));
    expect(priceId).toBe('cardano:tokenid');
  });
});

describe('BitcoinTokenPriceId', () => {
  it('should create correct price ID for Bitcoin', () => {
    const priceId = BitcoinTokenPriceId('btc');
    expect(priceId).toBe('bitcoin:btc');
  });

  it('should lowercase the identifier', () => {
    const priceId = BitcoinTokenPriceId('BTC');
    expect(priceId).toBe('bitcoin:btc');
  });
});
