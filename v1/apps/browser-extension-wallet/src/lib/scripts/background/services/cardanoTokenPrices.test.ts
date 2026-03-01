/* eslint-disable camelcase, no-magic-numbers */
import { Cardano } from '@cardano-sdk/core';

import { extractTokenPriceFromPool } from './cardanoTokenPrices';

jest.mock('webextension-polyfill', () => ({
  storage: { local: { get: jest.fn().mockResolvedValue({}), set: jest.fn().mockResolvedValue(void 0) } }
}));
jest.mock('@lace/cardano', () => ({ Wallet: { util: { mayBeNFT: jest.fn() } } }));
jest.mock('@src/config', () => ({ config: () => ({ TOKEN_PRICE_CHECK_INTERVAL: 300_000 }) }));

const assetId = 'a1b2c3d4e5f6' as Cardano.AssetId;

const makePool = ({
  baseTokenId,
  basePriceNative,
  quotePriceNative,
  h24Change
}: {
  baseTokenId: string;
  basePriceNative: string;
  quotePriceNative: string;
  h24Change: string;
}) => ({
  attributes: {
    base_token_price_native_currency: basePriceNative,
    quote_token_price_native_currency: quotePriceNative,
    price_change_percentage: { h24: h24Change }
  },
  relationships: {
    base_token: { data: { id: baseTokenId } }
  }
});

describe('extractTokenPriceFromPool', () => {
  it('returns base token price when queried asset is the base token', () => {
    const pool = makePool({
      baseTokenId: `cardano_${assetId}`,
      basePriceNative: '2.78',
      quotePriceNative: '0.36',
      h24Change: '-1.5'
    });

    const result = extractTokenPriceFromPool(pool, assetId);

    expect(result).toEqual({
      priceInAda: 2.78,
      priceVariationPercentage24h: -1.5
    });
  });

  it('returns quote token price when queried asset is the quote token', () => {
    const otherAssetId = 'ff00ff00ff00';
    const pool = makePool({
      baseTokenId: `cardano_${otherAssetId}`,
      basePriceNative: '0.10',
      quotePriceNative: '2.78',
      h24Change: '3.2'
    });

    const result = extractTokenPriceFromPool(pool, assetId);

    expect(result).toEqual({
      priceInAda: 2.78,
      priceVariationPercentage24h: 3.2
    });
  });

  it('returns undefined when pool is undefined', () => {
    expect(extractTokenPriceFromPool(undefined, assetId)).toBeUndefined();
  });

  it('returns undefined when attributes is not the expected shape', () => {
    const pool = { attributes: 'invalid' } as Parameters<typeof extractTokenPriceFromPool>[0];
    expect(extractTokenPriceFromPool(pool, assetId)).toBeUndefined();
  });

  it('returns undefined when price fields are not strings', () => {
    const pool = {
      attributes: {
        base_token_price_native_currency: 2.78 as unknown as string,
        quote_token_price_native_currency: 0.36 as unknown as string,
        price_change_percentage: { h24: '-1.5' }
      },
      relationships: {
        base_token: { data: { id: `cardano_${assetId}` } }
      }
    };

    expect(extractTokenPriceFromPool(pool, assetId)).toBeUndefined();
  });

  it('returns undefined when h24 change is missing', () => {
    const pool = {
      attributes: {
        base_token_price_native_currency: '2.78',
        quote_token_price_native_currency: '0.36',
        price_change_percentage: {}
      },
      relationships: {
        base_token: { data: { id: `cardano_${assetId}` } }
      }
    };

    expect(extractTokenPriceFromPool(pool, assetId)).toBeUndefined();
  });

  it('defaults to quote token price when relationships are missing', () => {
    const pool = {
      attributes: {
        base_token_price_native_currency: '0.10',
        quote_token_price_native_currency: '2.78',
        price_change_percentage: { h24: '0.5' }
      }
    };

    const result = extractTokenPriceFromPool(pool, assetId);

    expect(result).toEqual({
      priceInAda: 2.78,
      priceVariationPercentage24h: 0.5
    });
  });
});
