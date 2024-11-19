/* eslint-disable no-magic-numbers */
import { Wallet } from '@lace/cardano';
import { mockAsset } from '@src/utils/mocks/test-helpers';
import { getADACoinProperties, getAssetFiatValue, getAssetProperties, getMaxSpendableAmount } from '../util';
import { SpentBalances } from '../../../../types';
import { PriceResult } from '@hooks';
import { CurrencyInfo } from '@src/types';
import { currencyCode } from '@providers/currency/constants';

describe('CoinInput util', () => {
  describe('getMaxSpendableAmount', () => {
    test('calculates the maximum amount by subtracting the values for all inputs except the current one from the balance', () => {
      // 100 - (50 - 20) = 70
      expect(getMaxSpendableAmount('100', '50', '20')).toBe('70');
      // 100 - (50 - 0) = 50
      expect(getMaxSpendableAmount('100', '50', '0')).toBe('50');
    });

    test('returns 0 if the calculated maximum spendable amount is less than or equal to zero', () => {
      expect(getMaxSpendableAmount('50', '80', '30')).toBe('0');
      expect(getMaxSpendableAmount('50', '90', '30')).toBe('0');
    });

    test('returns 0 if any parameter is not a valid number', () => {
      expect(getMaxSpendableAmount('100', '50', 'Not a number')).toBe('0');
      expect(getMaxSpendableAmount('100', 'Not a number', '20')).toBe('0');
      expect(getMaxSpendableAmount('Not a number', '50', '20')).toBe('0');
    });
  });

  describe('getADACoinProperties', () => {
    test('returns 0 for availableADA and false for hasMaxBtn when balance is 0', () => {
      expect(getADACoinProperties('0', '1000000', '0', '0', '0')).toEqual({
        availableADA: '0.00',
        max: '1',
        hasMaxBtn: false,
        hasReachedMaxAmount: false,
        allowFloat: true
      });
    });
    test('returns 0 for max and true for hasReachedMaxAmount when spendable coins is 0', () => {
      expect(getADACoinProperties('1000000', '0', '0', '0', '0')).toEqual({
        availableADA: '1.00',
        max: '0',
        hasMaxBtn: true,
        hasReachedMaxAmount: true,
        allowFloat: true
      });
    });
    test('returns formatted balance as availableADA, and the spendable coin in ADA as max when there is no spending', () => {
      expect(getADACoinProperties('20000000', '10000000', '0', '0', '0')).toEqual({
        availableADA: '20.00',
        max: '10',
        hasMaxBtn: true,
        hasReachedMaxAmount: false,
        allowFloat: true
      });
    });
    test('returns the calculated max amount when there is less spent coin than spendable coin', () => {
      expect(getADACoinProperties('20000000', '10000000', '5', '2', '0')).toEqual({
        availableADA: '20.00',
        max: '7',
        hasMaxBtn: true,
        hasReachedMaxAmount: false,
        allowFloat: true
      });
    });
    test('returns max amount as 0 and hasReachedMaxAmount as true when there is more spent coin than spendable coin', () => {
      expect(getADACoinProperties('20000000', '10000000', '10', '0', '0')).toEqual({
        availableADA: '20.00',
        max: '0',
        hasMaxBtn: true,
        hasReachedMaxAmount: true,
        allowFloat: true
      });
    });
  });

  describe('getAssetProperties', () => {
    const mockAssetId = mockAsset.assetId.toString();
    const mockAssetInfo = {
      assetId: mockAsset.assetId,
      fingerprint: mockAsset.fingerprint,
      tokenMetadata: { decimals: 0, ticker: 'MOCK', name: 'Mock Token Name' },
      nftMetadata: { name: 'Mock NFT name' }
    } as Wallet.Asset.AssetInfo;
    const mockSpentBalances: SpentBalances = { [mockAssetId]: '25' };

    test('calculates the max spendable amount and disallows float for a token with no decimals', () => {
      const assetProps = getAssetProperties(
        { id: mockAssetId, value: '10' },
        mockAssetInfo,
        new Map([[mockAsset.assetId, BigInt(50)]]),
        mockSpentBalances
      );
      expect(assetProps.allowFloat).toEqual(false);
      expect(assetProps.maxSpendableAmount).toEqual('35');
      expect(assetProps.totalAssetBalance).toEqual('50');
      expect(assetProps.totalAssetSpent).toEqual('25');
      expect(assetProps.hasReachedMaxAmount).toEqual(false);
      expect(assetProps.maxDecimals).toEqual(0);
    });

    test('calculates the max spendable amount and allows float for a token with decimals', () => {
      const assetProps = getAssetProperties(
        { id: mockAssetId, value: '10' },
        { ...mockAssetInfo, tokenMetadata: { ...mockAssetInfo, decimals: 6 } } as Wallet.Asset.AssetInfo,
        new Map([[mockAsset.assetId, BigInt(50_125_000)]]),
        mockSpentBalances
      );
      expect(assetProps.allowFloat).toEqual(true);
      expect(assetProps.maxSpendableAmount).toEqual('35.125');
      expect(assetProps.totalAssetBalance).toEqual('50.125');
      expect(assetProps.totalAssetSpent).toEqual('25');
      expect(assetProps.hasReachedMaxAmount).toEqual(false);
      expect(assetProps.maxDecimals).toEqual(6);
    });

    test('returns max spendable amount = 0 if all is already spent', () => {
      const assetProps = getAssetProperties(
        { id: mockAssetId, value: '0' },
        { ...mockAssetInfo, tokenMetadata: { ...mockAssetInfo, decimals: 6 } } as Wallet.Asset.AssetInfo,
        new Map([[mockAsset.assetId, BigInt(50_125_000)]]),
        { [mockAssetId]: '50.125' }
      );
      expect(assetProps.allowFloat).toEqual(true);
      expect(assetProps.maxSpendableAmount).toEqual('0');
      expect(assetProps.totalAssetBalance).toEqual('50.125');
      expect(assetProps.totalAssetSpent).toEqual('50.125');
      expect(assetProps.hasReachedMaxAmount).toEqual(true);
      expect(assetProps.maxDecimals).toEqual(6);
    });

    describe('asset ticker', () => {
      test('displays nft metadata name when defined', () => {
        const assetProps = getAssetProperties(
          { id: mockAssetId, value: '0' },
          mockAssetInfo,
          new Map([[mockAsset.assetId, BigInt(2)]]),
          mockSpentBalances
        );
        expect(assetProps.ticker).toEqual(mockAssetInfo.nftMetadata.name);
      });
      test('displays token metadata ticker when nft metadata is not defined', () => {
        const assetProps = getAssetProperties(
          { id: mockAssetId, value: '0' },
          { ...mockAssetInfo, nftMetadata: undefined },
          new Map([[mockAsset.assetId, BigInt(2)]]),
          mockSpentBalances
        );
        expect(assetProps.ticker).toEqual(mockAssetInfo.tokenMetadata.ticker);
      });
      test('displays token metadata name when ticker and nft metadata are not defined', () => {
        const assetProps = getAssetProperties(
          { id: mockAssetId, value: '0' },
          {
            ...mockAssetInfo,
            tokenMetadata: { ...mockAssetInfo.tokenMetadata, ticker: undefined },
            nftMetadata: undefined
          },
          new Map([[mockAsset.assetId, BigInt(2)]]),
          mockSpentBalances
        );
        expect(assetProps.ticker).toEqual(mockAssetInfo.tokenMetadata.name);
      });
      test('displays fingerprint when token and nft metadata are not defined', () => {
        const assetProps = getAssetProperties(
          { id: mockAssetId, value: '0' },
          {
            ...mockAssetInfo,
            tokenMetadata: undefined,
            nftMetadata: undefined
          },
          new Map([[mockAsset.assetId, BigInt(2)]]),
          mockSpentBalances
        );
        expect(assetProps.ticker).toEqual(mockAssetInfo.fingerprint);
      });
    });
  });

  describe('getAssetFiatValue', () => {
    const assetInfo = { tokenMetadata: { name: 'Test Token' } } as Wallet.Asset.AssetInfo;
    const assetInputItem = { id: mockAsset.assetId.toString(), value: '5' };
    const prices = {
      tokens: new Map([[mockAsset.assetId, { priceInAda: 10 }]]),
      cardano: { price: 0.5 }
    } as PriceResult;
    const fiatCurrency: CurrencyInfo = { symbol: '$', code: currencyCode.USD };

    test('returns the formatted fiat value string if all the required parameters are present', () => {
      expect(getAssetFiatValue(assetInputItem, assetInfo, prices, fiatCurrency)).toEqual('= 25.000 USD');
    });

    test('returns "= 0 USD" if the asset input item value is not defined', () => {
      expect(getAssetFiatValue({ ...assetInputItem, value: undefined }, assetInfo, prices, fiatCurrency)).toEqual(
        '= 0 USD'
      );
    });

    describe('returns "-"', () => {
      test('if the asset has no metadata', () => {
        expect(
          getAssetFiatValue(
            assetInputItem,
            { tokenMetadata: undefined } as Wallet.Asset.AssetInfo,
            prices,
            fiatCurrency
          )
        ).toEqual('-');
      });

      test('if there is no price in ADA for the asset', () => {
        expect(getAssetFiatValue(assetInputItem, assetInfo, { ...prices, tokens: new Map() }, fiatCurrency)).toEqual(
          '-'
        );
        expect(
          getAssetFiatValue(
            { ...assetInputItem, id: '659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c41' }, // != mockAsset.assetId
            assetInfo,
            prices,
            fiatCurrency
          )
        ).toEqual('-');
        expect(
          getAssetFiatValue(
            assetInputItem,
            assetInfo,
            { ...prices, tokens: new Map([[mockAsset.assetId, {}]]) } as PriceResult,
            fiatCurrency
          )
        ).toEqual('-');
      });

      test('if there is no fiat price for ADA', () => {
        expect(
          getAssetFiatValue(assetInputItem, assetInfo, { ...prices, cardano: {} } as PriceResult, fiatCurrency)
        ).toEqual('-');
      });
    });
  });
});
