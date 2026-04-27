import { describe, expect, it } from 'vitest';

import {
  ADA_TOKEN_TICKER,
  getAdaTokenTickerByNetwork,
  TADA_TOKEN_TICKER,
} from '../src';

describe('getAdaTokenTickerByNetwork', () => {
  it('returns ADA for mainnet', () => {
    expect(getAdaTokenTickerByNetwork('mainnet')).toBe(ADA_TOKEN_TICKER);
  });

  it('returns tADA for testnet', () => {
    expect(getAdaTokenTickerByNetwork('testnet')).toBe(TADA_TOKEN_TICKER);
  });

  it('returns ADA when networkType is undefined (default mainnet display)', () => {
    expect(getAdaTokenTickerByNetwork(undefined)).toBe(ADA_TOKEN_TICKER);
  });

  it('exports ticker constants', () => {
    expect(ADA_TOKEN_TICKER).toBe('ADA');
    expect(TADA_TOKEN_TICKER).toBe('tADA');
  });
});
