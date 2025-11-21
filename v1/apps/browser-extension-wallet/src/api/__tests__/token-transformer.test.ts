import '@testing-library/jest-dom';
import { tokenTransformer } from '../transformers';
import { mockAsset, mockPrices } from '../../utils/mocks/test-helpers';
import { Wallet } from '@lace/cardano';
import { defaultCurrency } from '@providers/currency/constants';

const balance = [
  Wallet.Cardano.AssetId('6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7'),
  BigInt('3000000')
] as [Wallet.Cardano.AssetId, bigint];

describe('Testing tokenTransformer function', () => {
  test('should format token with asset name as name and symbol, with no logo and no fiatBalance', () => {
    const result = tokenTransformer(mockAsset, balance, mockPrices, defaultCurrency);
    expect(result.id).toBe(balance[0].toString());
    expect(result.amount).toBe(balance[1].toString());
    expect(result.name).toBe(mockAsset.tokenMetadata.name);
    expect(result.symbol).toBe(mockAsset.tokenMetadata.name);
    expect(result.fiatBalance).toBeUndefined();
    expect(result.logo).toBe('');
  });

  test('should format token with fingerprint as name and ticker as symbol', () => {
    const assetWithNoMetadataName = { ...mockAsset };
    delete assetWithNoMetadataName.tokenMetadata.name;
    const result = tokenTransformer(mockAsset, balance, mockPrices, defaultCurrency);
    expect(result.name).toBe(mockAsset.fingerprint.toString());
    expect(result.symbol).toBe(mockAsset.tokenMetadata.ticker);
  });

  test('should format token with fingerprint as name and fingerprint with ellipsis format as symbol', () => {
    const assetWithNoMetadataNameAndTicker = { ...mockAsset };
    delete assetWithNoMetadataNameAndTicker.tokenMetadata.name;
    delete assetWithNoMetadataNameAndTicker.tokenMetadata.ticker;
    const result = tokenTransformer(mockAsset, balance, mockPrices, defaultCurrency);
    expect(result.name).toBe(mockAsset.fingerprint.toString());
    expect(result.symbol).toBe('asset1cv...h3kcz0');
  });

  test('should format token with fiatBalance', () => {
    const prices = {
      ...mockPrices,
      cardano: {
        ...mockPrices.cardano,
        getTokenPrice: (assetId: Wallet.Cardano.AssetId) =>
          assetId === balance[0] ? { priceInAda: 1.2, priceVariationPercentage24h: 2.9 } : undefined
      }
    };
    const result = tokenTransformer(mockAsset, balance, prices, defaultCurrency);
    const tokenPrice = 1.2;
    const fiatBalanceResult = tokenPrice * mockPrices.cardano.price * Number(balance[1]);
    expect(result.fiatBalance).toBe(`${fiatBalanceResult}.000 USD`);
  });
});
