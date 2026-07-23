import { LOVELACE_TOKEN_ID } from '@lace-contract/cardano-context';
import { CardanoTokenPriceId } from '@lace-contract/token-pricing';
import { describe, it, expect } from 'vitest';

import { calculateAdaFiatValue } from '../src/common/utils/sign-tx-utils';

import type { TokenPrice, TokenPriceId } from '@lace-contract/token-pricing';

const adaPrice = (price: number): TokenPrice =>
  ({
    priceId: CardanoTokenPriceId(LOVELACE_TOKEN_ID),
    blockchain: 'Cardano',
    identifier: 'ada',
    price,
    priceInUsd: price,
    fiatCurrency: 'USD',
    lastUpdated: 0,
  } as TokenPrice);

describe('calculateAdaFiatValue', () => {
  it('computes the fiat value from the ADA price keyed by the lovelace tokenId', () => {
    const prices = {
      [CardanoTokenPriceId(LOVELACE_TOKEN_ID)]: adaPrice(0.5),
    } as Record<TokenPriceId, TokenPrice>;

    // 2 ADA (2_000_000 lovelace) * 0.5 = 1.00
    expect(calculateAdaFiatValue(2_000_000n, prices, 'USD')).toBe('1.00 USD');
  });

  it('returns undefined when the ADA price is only under the legacy cardano:ada key', () => {
    const prices = {
      [CardanoTokenPriceId('ada')]: adaPrice(0.5),
    } as Record<TokenPriceId, TokenPrice>;

    expect(calculateAdaFiatValue(2_000_000n, prices, 'USD')).toBeUndefined();
  });

  it('returns undefined when prices or currency are missing', () => {
    const prices = {
      [CardanoTokenPriceId(LOVELACE_TOKEN_ID)]: adaPrice(0.5),
    } as Record<TokenPriceId, TokenPrice>;

    expect(calculateAdaFiatValue(2_000_000n, undefined, 'USD')).toBeUndefined();
    expect(
      calculateAdaFiatValue(2_000_000n, prices, undefined),
    ).toBeUndefined();
  });
});
