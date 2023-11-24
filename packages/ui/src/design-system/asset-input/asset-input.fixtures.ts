import type { Asset, AssetState } from './asset-input.data';

export const asset: Asset = {
  balance: String(10_000_000),
  amount: '',
  id: '',
  ticker: 'Token',
  fiat: {
    value: '0',
    ticker: 'USD',
  },
};

export const validState = (id = '1'): AssetState => ({
  type: 'valid',
  asset: {
    ...asset,
    id,
  },
});

export const invalidState = (id = '1'): AssetState => ({
  type: 'invalid',
  asset: {
    ...asset,
    id,
  },
  error: 'Insufficient balance',
});
