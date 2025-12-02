/* eslint-disable unicorn/no-null */
/* eslint-disable no-magic-numbers, unicorn/no-useless-undefined */
import '@testing-library/jest-dom';
import { GetTokenListParams, getTokenList } from '../get-token-list';
import { mockAsset, mockNft } from '../mocks/test-helpers';
import { defaultCurrency } from '@providers/currency/constants';
import { Wallet } from '@lace/cardano';
import { Asset } from '@cardano-sdk/core';
import { PriceResult } from '@hooks';
import { TokenPrice } from '@lib/scripts/types';

const testEnvironment = 'Preprod';

describe('getTokensList', () => {
  const assetId = Wallet.Cardano.AssetId('659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c40');
  const assetPrice = { priceInAda: 22, priceVariationPercentage24h: 0.3 };
  const getTokenPrice = (asset: Wallet.Cardano.AssetId) => (asset === assetId ? assetPrice : undefined);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const emptyGetTokenPrice = (_: Wallet.Cardano.AssetId): TokenPrice | undefined => undefined;
  const payload = {
    assetsInfo: new Map([
      [mockAsset.assetId, mockAsset],
      [Wallet.Cardano.AssetId('659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c40'), mockAsset],
      [mockNft.assetId, mockNft],
      [
        Wallet.Cardano.AssetId('659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c42'),
        {
          ...mockNft,
          tokenMetadata: undefined,
          nftMetadata: undefined
        }
      ],
      [
        Wallet.Cardano.AssetId('659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c43'),
        {
          ...mockNft,
          tokenMetadata: undefined,
          nftMetadata: { name: undefined, image: undefined } as Asset.NftMetadata
        }
      ]
    ]),
    balance: new Map([
      [mockAsset.assetId, BigInt(20)],
      [assetId, BigInt(20)],
      [mockNft.assetId, BigInt(1)],
      [Wallet.Cardano.AssetId('659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c42'), BigInt(1)],
      [Wallet.Cardano.AssetId('659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c43'), BigInt(1)]
    ]),
    fiatCurrency: defaultCurrency,
    environmentName: testEnvironment,
    tokensSpent: { [mockAsset.assetId]: '1' },
    prices: {
      cardano: {
        getTokenPrice,
        price: 2,
        priceVariationPercentage24h: 0.2
      },
      bitcoin: {
        price: 2,
        priceVariationPercentage24h: 0.2
      },
      tokens: new Map([[assetId, { lastFetchTime: 0, price: assetPrice }]])
    }
  } as GetTokenListParams;
  test('should return a list with all nfts and another with all non-nft assets', () => {
    const { nftList, tokenList } = getTokenList(payload);

    expect(nftList).toHaveLength(3);
    expect(nftList[0].assetId).toEqual(mockNft.assetId);

    expect(tokenList).toHaveLength(2);
    expect(tokenList[0].assetId).toEqual(mockAsset.assetId);
    expect(tokenList[1].fiat).toEqual('880.000 USD');

    expect(nftList[1].name).toEqual('TSLA');
    expect(nftList[2].name).toEqual('TSLA');
    expect(nftList[1].image).toEqual(undefined);
    expect(nftList[2].image).toEqual(undefined);
  });

  test('should return proper fiat value in case prices are missing', () => {
    expect(getTokenList({ ...payload, prices: undefined }).tokenList[0].fiat).toEqual('-');
  });

  test('should return proper fiat value in case token is missing from tokens map', () => {
    expect(
      getTokenList({
        ...payload,
        prices: { cardano: { getTokenPrice: emptyGetTokenPrice }, tokens: new Map() } as PriceResult
      }).tokenList[0].fiat
    ).toEqual('-');
  });

  test('should return proper fiat value in case token data is missing from tokens map', () => {
    expect(
      getTokenList({
        ...payload,
        prices: {
          cardano: { getTokenPrice: emptyGetTokenPrice },
          tokens: new Map([[mockAsset.assetId, {}]])
        } as PriceResult
      }).tokenList[0].fiat
    ).toEqual('-');
  });

  test('should return proper fiat value in case assetsInfo is empty', () => {
    expect(getTokenList({ ...payload, assetsInfo: new Map() }).tokenList[0].fiat).toEqual('-');
  });

  test('should return proper fiat value in case token data is missing in assetsInfo', () => {
    expect(
      getTokenList({
        ...payload,
        assetsInfo: new Map([[mockAsset.assetId, undefined]]) as Map<Wallet.Cardano.AssetId, Wallet.Asset.AssetInfo>
      }).tokenList[0].fiat
    ).toEqual('-');
  });

  test('should return proper fiat value in case token prices map is missing', () => {
    expect(
      getTokenList({
        ...payload,
        prices: { cardano: { getTokenPrice: emptyGetTokenPrice } as PriceResult['cardano'] } as PriceResult
      }).tokenList[0].fiat
    ).toEqual('-');
  });

  test('should return proper fiat value in case cardano value is missing', () => {
    expect(
      getTokenList({
        ...payload,
        prices: { cardano: { getTokenPrice } as PriceResult['cardano'], tokens: payload.prices.tokens } as PriceResult
      }).tokenList[0].fiat
    ).toEqual('-');
  });

  test('should return empty arrays when there is no balance', async () => {
    const emptyMap = getTokenList({
      assetsInfo: new Map([
        [mockAsset.assetId, mockAsset],
        [mockNft.assetId, mockNft]
      ]),
      balance: new Map(),
      environmentName: testEnvironment,
      fiatCurrency: defaultCurrency
    });
    const undefinedBalance = getTokenList({
      assetsInfo: new Map([
        [mockAsset.assetId, mockAsset],
        [mockNft.assetId, mockNft]
      ]),
      balance: undefined,
      environmentName: testEnvironment,
      fiatCurrency: defaultCurrency
    });

    expect(emptyMap.nftList).toHaveLength(0);
    expect(emptyMap.tokenList).toHaveLength(0);
    expect(undefinedBalance.nftList).toHaveLength(0);
    expect(undefinedBalance.tokenList).toHaveLength(0);
  });

  test('should return as all assets as tokens with no metadata when there is no asset info', async () => {
    const emptyMap = getTokenList({
      assetsInfo: new Map(),
      balance: new Map([
        [mockAsset.assetId, BigInt(20)],
        [mockNft.assetId, BigInt(1)]
      ]),
      environmentName: testEnvironment,
      fiatCurrency: defaultCurrency
    });

    const undefinedInfo = getTokenList({
      assetsInfo: undefined,
      balance: new Map([
        [mockAsset.assetId, BigInt(20)],
        [mockNft.assetId, BigInt(1)]
      ]),
      environmentName: testEnvironment,
      fiatCurrency: defaultCurrency
    });

    expect(emptyMap.nftList).toHaveLength(0);
    expect(emptyMap.tokenList).toHaveLength(2);
    expect(undefinedInfo.nftList).toHaveLength(0);
    expect(undefinedInfo.tokenList).toHaveLength(2);
  });

  test('should return no info for assets that are not in the balance', async () => {
    const { nftList, tokenList } = getTokenList({
      assetsInfo: new Map([
        [mockAsset.assetId, mockAsset],
        [mockNft.assetId, mockNft]
      ]),
      balance: new Map([[mockAsset.assetId, BigInt(20)]]),
      environmentName: testEnvironment,
      fiatCurrency: defaultCurrency
    });

    expect(nftList).toHaveLength(0);
    expect(tokenList).toHaveLength(1);
    expect(tokenList[0].assetId).toEqual(mockAsset.assetId);
  });

  test('token metadata should have preference over nft metadata for tokens', async () => {
    const { nftList, tokenList } = getTokenList({
      assetsInfo: new Map([
        [
          mockAsset.assetId,
          {
            ...mockAsset,
            tokenMetadata: {
              assetId: Wallet.Cardano.AssetId('6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7'),
              decimals: 6,
              desc: 'Testcoin crypto powered by Cardano testnet.',
              icon: 'some_icon',
              name: 'Testcoin',
              ticker: 'TEST',
              url: 'https://developers.cardano.org/'
            },
            nftMetadata: {
              image: Wallet.Asset.Uri('ipfs://asd.io'),
              name: 'Some Token',
              version: '2',
              description: 'NFT MOCK',
              otherProperties: new Map([
                ['ticker', 'NFT'],
                ['decimals', '6']
              ])
            }
          }
        ]
      ]),
      balance: new Map([[mockAsset.assetId, BigInt(20)]]),
      fiatCurrency: defaultCurrency
    });

    expect(nftList).toHaveLength(0);
    expect(tokenList).toHaveLength(1);
    expect(tokenList[0].assetId).toEqual(mockAsset.assetId);
    expect(tokenList[0].name).toEqual('Testcoin');
    expect(tokenList[0].logo).toEqual('data:image/png;base64,some_icon');

    // Test vector computed with getRandomIcon({ id: mockAsset.assetId.toString(), size: 30 })
    expect(tokenList[0].defaultLogo).toEqual(
      'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2230%22%20height%3D%2230%22%20viewBox%3D%220%200%2030%2030%22%3E%3Cpath%20fill%3D%22%23a8383e%22%20d%3D%22M9%209L9%203L15%203ZM15%203L21%203L21%209ZM21%2021L21%2027L15%2027ZM15%2027L9%2027L9%2021ZM3%2015L3%209L9%209ZM21%209L27%209L27%2015ZM27%2015L27%2021L21%2021ZM9%2021L3%2021L3%2015Z%22%2F%3E%3Cpath%20fill%3D%22%23d1757a%22%20d%3D%22M9%203L9%209L3%209ZM27%209L21%209L21%203ZM21%2027L21%2021L27%2021ZM3%2021L9%2021L9%2027Z%22%2F%3E%3Cpath%20fill%3D%22%23e8babc%22%20d%3D%22M15%2012L15%2015L12%2015ZM18%2015L15%2015L15%2012ZM15%2018L15%2015L18%2015ZM12%2015L15%2015L15%2018Z%22%2F%3E%3C%2Fsvg%3E'
    );
    expect(tokenList[0].description).toEqual('TEST');
    expect(tokenList[0].decimals).toEqual(6);
  });

  test('token metadata should fell-back to nft metadata if token metadata is missing', async () => {
    const { nftList, tokenList } = getTokenList({
      assetsInfo: new Map([
        [
          mockAsset.assetId,
          {
            ...mockAsset,
            tokenMetadata: undefined,
            nftMetadata: {
              image: Wallet.Asset.Uri('ipfs://asd.io'),
              name: 'Some Token',
              version: '2',
              description: 'NFT MOCK',
              otherProperties: new Map([
                ['ticker', 'NFT'],
                ['decimals', '6']
              ])
            }
          }
        ]
      ]),
      balance: new Map([[mockAsset.assetId, BigInt(20)]]),
      fiatCurrency: defaultCurrency
    });

    expect(nftList).toHaveLength(0);
    expect(tokenList).toHaveLength(1);
    expect(tokenList[0].assetId).toEqual(mockAsset.assetId);
    expect(tokenList[0].name).toEqual('Some Token');
    expect(tokenList[0].logo).toEqual('https://ipfs.blockfrost.dev/ipfs/asd.io');

    // Test vector computed with getRandomIcon({ id: mockAsset.assetId.toString(), size: 30 })
    expect(tokenList[0].defaultLogo).toEqual(
      'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2230%22%20height%3D%2230%22%20viewBox%3D%220%200%2030%2030%22%3E%3Cpath%20fill%3D%22%23a8383e%22%20d%3D%22M9%209L9%203L15%203ZM15%203L21%203L21%209ZM21%2021L21%2027L15%2027ZM15%2027L9%2027L9%2021ZM3%2015L3%209L9%209ZM21%209L27%209L27%2015ZM27%2015L27%2021L21%2021ZM9%2021L3%2021L3%2015Z%22%2F%3E%3Cpath%20fill%3D%22%23d1757a%22%20d%3D%22M9%203L9%209L3%209ZM27%209L21%209L21%203ZM21%2027L21%2021L27%2021ZM3%2021L9%2021L9%2027Z%22%2F%3E%3Cpath%20fill%3D%22%23e8babc%22%20d%3D%22M15%2012L15%2015L12%2015ZM18%2015L15%2015L15%2012ZM15%2018L15%2015L18%2015ZM12%2015L15%2015L15%2018Z%22%2F%3E%3C%2Fsvg%3E'
    );
    expect(tokenList[0].description).toEqual('NFT');
    expect(tokenList[0].decimals).toEqual(6);
  });

  test('nft metadata should have preference over token metadata for NFTs', async () => {
    const { nftList, tokenList } = getTokenList({
      assetsInfo: new Map([
        [
          mockNft.assetId,
          {
            ...mockNft,
            tokenMetadata: {
              assetId: Wallet.Cardano.AssetId('6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7'),
              decimals: 6,
              desc: 'Testcoin crypto powered by Cardano testnet.',
              icon: 'some_icon',
              name: 'Testcoin',
              ticker: 'TEST',
              url: 'https://developers.cardano.org/'
            },
            nftMetadata: {
              image: Wallet.Asset.Uri('ipfs://asd.io'),
              name: 'Some Token',
              version: '2',
              description: 'NFT MOCK',
              otherProperties: new Map([
                ['ticker', 'NFT'],
                ['decimals', '6']
              ])
            }
          }
        ]
      ]),
      balance: new Map([[mockNft.assetId, BigInt(1)]]),
      fiatCurrency: defaultCurrency
    });

    expect(tokenList).toHaveLength(0);
    expect(nftList).toHaveLength(1);
    expect(nftList[0].assetId).toEqual(mockNft.assetId);
    expect(nftList[0].name).toEqual('Some Token');
    expect(nftList[0].image).toEqual('https://ipfs.blockfrost.dev/ipfs/asd.io');
  });

  test('nft metadata should fell-back to token metadata if nft metadata is missing', async () => {
    const { nftList, tokenList } = getTokenList({
      assetsInfo: new Map([
        [
          mockNft.assetId,
          {
            ...mockNft,
            tokenMetadata: {
              assetId: mockNft.assetId,
              decimals: undefined,
              desc: 'Mock NFT',
              icon: 'some_icon',
              name: 'Mock NFT',
              ticker: 'NFT'
            },
            nftMetadata: undefined
          }
        ]
      ]),
      balance: new Map([[mockNft.assetId, BigInt(1)]]),
      fiatCurrency: defaultCurrency
    });

    expect(tokenList).toHaveLength(0);
    expect(nftList).toHaveLength(1);

    expect(nftList[0].assetId).toEqual(mockNft.assetId);
    expect(nftList[0].name).toEqual('Mock NFT');
    expect(nftList[0].image).toEqual('data:image/png;base64,some_icon');
  });
});
