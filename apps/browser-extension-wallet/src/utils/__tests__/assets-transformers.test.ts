/* eslint-disable import/imports-first */
/* eslint-disable max-statements */
/* eslint-disable no-magic-numbers */
const mockCalculateAssetBalance = jest.fn();
import { Wallet } from '@lace/cardano';
import * as common from '@lace/common';
import * as getAssetImage from '@src/utils/get-asset-image-url';
import * as getRandomIcon from '@src/utils/get-random-icon';
import * as assetsTransformers from '../assets-transformers';
import * as formatNumber from '@src/utils/format-number';
import * as transformers from '@src/api/transformers';
import { TokenPrice } from '@lib/scripts/types';
import BigNumber from 'bignumber.js';

jest.mock('@lace/cardano', () => {
  const actual = jest.requireActual<any>('@lace/cardano');
  return {
    __esModule: true,
    ...actual,
    Wallet: {
      ...actual.Wallet,
      util: {
        ...actual.Wallet.util,
        calculateAssetBalance: mockCalculateAssetBalance
      }
    }
  };
});

describe('Testing assets transformers', () => {
  describe('getTokenAmountInFiat', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });
    test('should return proper amount in fiat', () => {
      const amount = '22';
      const priceInAda = 13;
      const fiat = 14;
      expect(assetsTransformers.getTokenAmountInFiat(amount, priceInAda, fiat)).toEqual('4004');
    });
  });

  describe('parseFiat', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });
    test('should return proper amount in fiat', () => {
      expect(assetsTransformers.parseFiat(0.567_89)).toEqual('0.6');
      expect(assetsTransformers.parseFiat(5.567_89)).toEqual('5.568');
    });
  });

  describe('variationParser', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });
    test('should return proper variation', () => {
      const formatLocaleNumberResult = 'formatLocaleNumberResult';

      const spy = jest.spyOn(formatNumber, 'formatLocaleNumber');
      spy.mockReturnValue(formatLocaleNumberResult);

      expect(assetsTransformers.variationParser(1)).toEqual('+formatLocaleNumberResult');
      expect(spy).toBeCalledWith('1');
      expect(assetsTransformers.variationParser(-1)).toEqual('formatLocaleNumberResult');
      expect(spy).toBeCalledWith('-1');

      spy.mockRestore();
    });
  });

  describe('cardanoTransformer', () => {
    const cardanoCoin = {
      id: 'id',
      symbol: 'symbol',
      name: 'name',
      decimals: 2
    };
    const params = {
      total: { coins: BigInt(20), assets: new Map() },
      fiatPrice: { price: 1, priceVariationPercentage24h: 1 },
      fiatCode: 'fiatCode',
      cardanoCoin
    };

    const result = {
      balance: '0.00',
      fiatBalance: '0.00 fiatCode',
      id: cardanoCoin.id,
      logo: 'test-file-stub',
      name: cardanoCoin.name,
      price: '1.000',
      ticker: cardanoCoin.symbol,
      variation: '+1.00'
    };
    beforeEach(() => {
      jest.resetAllMocks();
    });
    test('should return proper variation', () => {
      const walletBalanceTransformerResult = {
        coinBalance: 'coinBalance',
        fiatBalance: 'fiatBalance'
      };

      const walletBalanceTransformerSpy = jest.spyOn(transformers, 'walletBalanceTransformer');
      walletBalanceTransformerSpy.mockReturnValue({ ...walletBalanceTransformerResult, fiatBalance: '-' });

      const formatNumberSpy = jest.spyOn(formatNumber, 'formatLocaleNumber');
      formatNumberSpy.mockReturnValueOnce('formattedPrice');
      formatNumberSpy.mockReturnValue('balance');

      const variationParserrSpy = jest.spyOn(assetsTransformers, 'variationParser');
      variationParserrSpy.mockReturnValue('variationParserResult');

      expect(assetsTransformers.cardanoTransformer(params)).toEqual({
        ...result,
        balance: 'balance',
        price: 'formattedPrice',
        variation: 'variationParserResult',
        fiatBalance: `- ${params.fiatCode}`
      });
      expect(formatNumberSpy).toBeCalledWith(params.fiatPrice?.price.toString(), 3);
      expect(walletBalanceTransformerSpy).toBeCalledWith(params.total.coins.toString(), params.fiatPrice?.price);
      expect(variationParserrSpy).toBeCalledWith(params.fiatPrice?.priceVariationPercentage24h);

      // should return proper price if fiatPrice?.price is not a number
      expect(
        assetsTransformers.cardanoTransformer({ ...params, fiatPrice: { ...params.fiatPrice, price: undefined } }).price
      ).toEqual('-');

      // should return proper variation if fiatPrice?.priceVariationPercentage24h is not there
      expect(
        assetsTransformers.cardanoTransformer({
          ...params,
          fiatPrice: { ...params.fiatPrice, priceVariationPercentage24h: undefined }
        }).variation
      ).toEqual('-');

      // should return proper fiatBalance if balance.fiatBalance returned from walletBalanceTransformer is numeric
      const isNumericSpy = jest.spyOn(formatNumber, 'isNumeric');
      isNumericSpy.mockReturnValueOnce(true);
      walletBalanceTransformerSpy.mockReturnValue(walletBalanceTransformerResult);
      expect(assetsTransformers.cardanoTransformer(params).fiatBalance).toEqual(`balance ${params.fiatCode}`);
      expect(isNumericSpy).toBeCalledWith(walletBalanceTransformerResult.fiatBalance);
      expect(formatNumberSpy).toBeCalledWith(walletBalanceTransformerResult.fiatBalance);

      // should return proper fiatBalance if balance.fiatBalance returned from walletBalanceTransformer is not numeric
      isNumericSpy.mockReturnValueOnce(false);
      expect(assetsTransformers.cardanoTransformer(params).fiatBalance).toEqual(`? ${params.fiatCode}`);
      expect(isNumericSpy).toBeCalledWith(walletBalanceTransformerResult.fiatBalance);

      // should return balancesPlaceholder as balance and fiatBalance if areBalancesVisible is false
      const balancesPlaceholder = 'balancesPlaceholder';
      const { balance, fiatBalance } = assetsTransformers.cardanoTransformer({
        ...params,
        areBalancesVisible: false,
        balancesPlaceholder
      });
      expect(balance).toEqual(balancesPlaceholder);
      expect(fiatBalance).toEqual(balancesPlaceholder);

      walletBalanceTransformerSpy.mockRestore();
      formatNumberSpy.mockRestore();
      variationParserrSpy.mockRestore();
      isNumericSpy.mockRestore();
    });
  });

  describe('assetTransformer', () => {
    const tokenMetadata = { name: 'tokenMetadata.name', icon: 'getAssetImageUrl', decimals: 2 };
    const nftMetadata = {};
    const fingerprint = 'fingerprint';
    const policyId = 'policyId';
    const token = { tokenMetadata, nftMetadata, fingerprint, policyId } as Wallet.Asset.AssetInfo;

    const key = 'key' as Wallet.Cardano.AssetId;

    const total = {
      coins: BigInt(2),
      assets: new Map([[key, BigInt(2)]])
    };

    const pricesInfo = {
      id: 'pricesInfo.id',
      priceInAda: 'pricesInfo.priceInAda',
      priceVariationPercentage24h: 'pricesInfo.priceVariationPercentage24h'
    } as unknown as TokenPrice;

    const fiatCurrency = {
      code: 'fiatCurrency.code',
      symbol: 'fiatCurrency.symbol'
    };

    const params = {
      token,
      key,
      total,
      fiat: 2,
      pricesInfo,
      fiatCurrency
    };

    const result = {
      balance: '2.00',
      fiatBalance: 'NaN fiatCurrency.code',
      id: key,
      logo: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2230%22%20height%3D%2230%22%20viewBox%3D%220%200%2030%2030%22%3E%3Cpath%20fill%3D%22%23cc9d66%22%20d%3D%22M9%206L12%203L15%206L12%209ZM18%203L21%206L18%209L15%206ZM21%2024L18%2027L15%2024L18%2021ZM12%2027L9%2024L12%2021L15%2024ZM3%2012L6%209L9%2012L6%2015ZM24%209L27%2012L24%2015L21%2012ZM27%2018L24%2021L21%2018L24%2015ZM6%2021L3%2018L6%2015L9%2018Z%22%2F%3E%3Cpath%20fill%3D%22%234c4c4c%22%20d%3D%22M6%209L3%206L6%203L9%206ZM21%206L24%203L27%206L24%209ZM24%2021L27%2024L24%2027L21%2024ZM9%2024L6%2027L3%2024L6%2021Z%22%2F%3E%3Cpath%20fill%3D%22%23e5e5e5%22%20d%3D%22M9%209L15%209L15%2013.2L11.4%2011.4L13.2%2015L9%2015ZM21%209L21%2015L16.8%2015L18.6%2011.4L15%2013.2L15%209ZM21%2021L15%2021L15%2016.8L18.6%2018.6L16.8%2015L21%2015ZM9%2021L9%2015L13.2%2015L11.4%2018.6L15%2016.8L15%2021Z%22%2F%3E%3C%2Fsvg%3E',
      name: tokenMetadata.name,
      price: 'NaN',
      sortBy: {
        amount: '2',
        fiatBalance: 'NaN',
        fingerprint,
        metadataName: 'tokenMetadata.name',
        policyId: 'policyId'
      },
      ticker: 'fingerprint',
      variation: 'NaN'
    };
    beforeEach(() => {
      jest.resetAllMocks();
    });
    test('should return proper asset data', () => {
      const addEllipsisSpy = jest.spyOn(common, 'addEllipsis');
      addEllipsisSpy.mockReturnValue('addEllipsis');

      const getAssetImageUrlSpy = jest.spyOn(getAssetImage, 'getAssetImageUrl');
      getAssetImageUrlSpy.mockImplementation((str) => str);

      const parseFiatSpy = jest.spyOn(assetsTransformers, 'parseFiat');
      parseFiatSpy.mockReturnValueOnce('parseFiat');
      parseFiatSpy.mockReturnValue('formattedFiatBalance');

      const variationParserSpy = jest.spyOn(assetsTransformers, 'variationParser');
      variationParserSpy.mockReturnValue('variationParser');

      const compactNumberSpy = jest.spyOn(formatNumber, 'compactNumber');
      compactNumberSpy.mockReturnValue('compactNumberBalance');

      const mockedTokenBalance = '100';
      mockCalculateAssetBalance.mockReturnValueOnce(mockedTokenBalance);

      const fiat = 11;
      const priceInAda = 22;
      const fiatBalance = new BigNumber(mockedTokenBalance).multipliedBy(fiat * priceInAda).toNumber();
      expect(
        assetsTransformers.assetTransformer({
          ...params,
          pricesInfo: { ...pricesInfo, priceInAda },
          fiat
        })
      ).toEqual({
        ...result,
        logo: 'getAssetImageUrl',
        ticker: 'addEllipsis',
        price: 'parseFiat',
        variation: 'variationParser',
        balance: 'compactNumberBalance',
        fiatBalance: `formattedFiatBalance ${fiatCurrency.code}`,
        sortBy: {
          policyId,
          fiatBalance,
          metadataName: tokenMetadata?.name,
          fingerprint,
          amount: mockedTokenBalance
        }
      });
      expect(addEllipsisSpy).toBeCalledWith(fingerprint.toString(), 8, 6);
      expect(getAssetImageUrlSpy).toBeCalledWith(tokenMetadata.icon);
      expect(parseFiatSpy).toBeCalledWith(fiat * priceInAda);
      expect(variationParserSpy).toBeCalledWith(pricesInfo?.priceVariationPercentage24h);
      expect(mockCalculateAssetBalance).toBeCalledWith(total?.assets?.get(key), token);
      expect(compactNumberSpy).toBeCalledWith(mockedTokenBalance, tokenMetadata.decimals);
      expect(parseFiatSpy).toBeCalledWith(fiatBalance);

      // to see proper name in case it's missing on the tokenMetadata or nftMetadata level
      expect(
        assetsTransformers.assetTransformer({
          ...params,
          token: { ...token, tokenMetadata: {}, nftMetadata: {} } as Wallet.Asset.AssetInfo
        }).name
      ).toEqual('-');

      // to see proper name, icon, decimals taken from tokenMetadata level
      compactNumberSpy.mockReturnValue('tokenMetadatacCompactNumberBalance');
      const tokenMetadataName = 'tokenMetadataName';
      const tokenMetadataIcon = 'tokenMetadataIcon';
      const tokenMetadaDecimals = 2;
      const tokenMetadataResults = assetsTransformers.assetTransformer({
        ...params,
        token: {
          ...token,
          tokenMetadata: {
            name: tokenMetadataName,
            icon: tokenMetadataIcon,
            decimals: tokenMetadaDecimals
          },
          nftMetadata: {}
        } as Wallet.Asset.AssetInfo
      });
      expect(tokenMetadataResults.name).toEqual(tokenMetadataName);
      expect(tokenMetadataResults.logo).toEqual(tokenMetadataIcon);
      expect(tokenMetadataResults.balance).toEqual('tokenMetadatacCompactNumberBalance');
      expect(compactNumberSpy.mock.calls[0][1]).toEqual(tokenMetadaDecimals);

      // to see proper name, icon, decimals taken from nftMetadata level
      compactNumberSpy.mockReturnValue('nftMetadatacCompactNumberBalance');
      const nftMetadataName = 'nftMetadataName';
      const nftMetadataIcon = 'nftMetadataIcon';
      const nftMetadataResults = assetsTransformers.assetTransformer({
        ...params,
        token: {
          ...token,
          nftMetadata: {
            name: nftMetadataName,
            icon: nftMetadataIcon
          } as unknown as Wallet.Asset.AssetInfo['nftMetadata']
        } as Wallet.Asset.AssetInfo
      });
      expect(nftMetadataResults.name).toEqual(nftMetadataName);
      expect(nftMetadataResults.logo).toEqual(nftMetadataIcon);
      expect(nftMetadataResults.balance).toEqual('nftMetadatacCompactNumberBalance');

      // to see proper fiatBalance in case pricesInfo.priceInAda is missing
      const noPriceInAdaResults = assetsTransformers.assetTransformer({
        ...params,
        pricesInfo: { ...pricesInfo, priceInAda: undefined }
      });
      expect(noPriceInAdaResults.price).toEqual('-');
      expect(noPriceInAdaResults.fiatBalance).toEqual('-');
      expect(noPriceInAdaResults.sortBy.fiatBalance).toEqual(undefined);

      // to see proper fiatBalance in case fiat is missing
      const noFiatResults = assetsTransformers.assetTransformer({ ...params, fiat: undefined });
      expect(noFiatResults.price).toEqual('-');
      expect(noFiatResults.fiatBalance).toEqual('-');
      expect(noFiatResults.sortBy.fiatBalance).toEqual(undefined);

      // to see proper variations in case pricesInfo.priceVariationPercentage24h is missing
      expect(
        assetsTransformers.assetTransformer({
          ...params,
          pricesInfo: { ...pricesInfo, priceVariationPercentage24h: undefined }
        }).variation
      ).toEqual('-');

      // to see proper icon in case icon is missing from assetMetadata
      const getRandomIconSpy = jest.spyOn(getRandomIcon, 'getRandomIcon');
      getRandomIconSpy.mockReturnValue('getRandomIcon');
      expect(
        assetsTransformers.assetTransformer({
          ...params,
          token: {
            ...token,
            tokenMetadata: {},
            nftMetadata: {}
          } as Wallet.Asset.AssetInfo
        }).logo
      ).toEqual('getRandomIcon');
      expect(getRandomIconSpy).toBeCalledWith({ id: key.toString(), size: 30 });

      // to see proper balance and fiatbalance in case areBalancesVisible is set to false
      const balancesPlaceholder = 'balancesPlaceholder';
      const areBalancesVisibleResults = assetsTransformers.assetTransformer({
        ...params,
        areBalancesVisible: false,
        balancesPlaceholder
      });
      expect(areBalancesVisibleResults.balance).toEqual(balancesPlaceholder);
      expect(areBalancesVisibleResults.fiatBalance).toEqual(balancesPlaceholder);

      addEllipsisSpy.mockRestore();
      getAssetImageUrlSpy.mockRestore();
      parseFiatSpy.mockRestore();
      variationParserSpy.mockRestore();
      compactNumberSpy.mockRestore();
      getRandomIconSpy.mockRestore();
    });
  });
});
