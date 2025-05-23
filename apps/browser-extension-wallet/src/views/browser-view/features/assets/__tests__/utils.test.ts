/* eslint-disable no-magic-numbers */
import { Wallet } from '@lace/cardano';
import { AssetSortBy } from '../types';
import { getTotalWalletBalance, sortAssets } from '../utils';
import { TokenPrices } from '@lib/scripts/types';

describe('assets utils', () => {
  describe('sortAssets', () => {
    const tokenA: AssetSortBy = {
      sortBy: {
        fingerprint: Wallet.Cardano.AssetFingerprint('asset1cvmyrfrc7lpht2hcjwr9lulzyyjv27uxh3kcz0'),
        amount: '30',
        fiatBalance: 1000,
        metadataName: 'TokenA'
      }
    };

    const tokenB: AssetSortBy = {
      sortBy: {
        fingerprint: Wallet.Cardano.AssetFingerprint('asset1pkpwyknlvul7az0xx8czhl60pyel45rpje4z8w'),
        amount: '20',
        fiatBalance: 500,
        metadataName: 'TokenB'
      }
    };

    const tokenC: AssetSortBy = {
      sortBy: {
        fingerprint: Wallet.Cardano.AssetFingerprint('asset1s3yhz885gnyu2wcpz5h275u37hw3axz3c9sfqu'),
        amount: '10',
        fiatBalance: 100,
        metadataName: 'TokenC'
      }
    };

    describe('by fiat balance first', () => {
      test('sorts in descending order', () => {
        const arrayToSort: AssetSortBy[] = [
          { sortBy: { ...tokenA.sortBy, fiatBalance: 2500 } },
          { sortBy: { ...tokenB.sortBy, fiatBalance: 1000 } },
          { sortBy: { ...tokenC.sortBy, fiatBalance: 1_000_000 } }
        ];
        const sorted = [...arrayToSort].sort(sortAssets);
        expect(sorted).toEqual([arrayToSort[2], arrayToSort[0], arrayToSort[1]]);
      });
      test('sorts with undefined last', () => {
        const arrayToSort: AssetSortBy[] = [
          { sortBy: { ...tokenA.sortBy, fiatBalance: undefined } },
          { sortBy: { ...tokenB.sortBy, fiatBalance: 1000 } },
          { sortBy: { ...tokenC.sortBy, fiatBalance: 1_000_000 } }
        ];
        const sorted = [...arrayToSort].sort(sortAssets);
        expect(sorted).toEqual([arrayToSort[2], arrayToSort[1], arrayToSort[0]]);
      });
    });

    describe('by amount second', () => {
      test('sorts in descending order', () => {
        const arrayToSort: AssetSortBy[] = [
          { sortBy: { ...tokenA.sortBy, amount: '2000', fiatBalance: 2000 } },
          { sortBy: { ...tokenB.sortBy, amount: '1000', fiatBalance: 2000 } },
          { sortBy: { ...tokenC.sortBy, amount: '3000', fiatBalance: 2000 } }
        ];
        const sorted = [...arrayToSort].sort(sortAssets);
        expect(sorted).toEqual([arrayToSort[2], arrayToSort[0], arrayToSort[1]]);
      });
      test('sorts with undefined last', () => {
        const arrayToSort: AssetSortBy[] = [
          { sortBy: { ...tokenA.sortBy, amount: undefined, fiatBalance: undefined } },
          { sortBy: { ...tokenB.sortBy, amount: '1000', fiatBalance: undefined } },
          { sortBy: { ...tokenC.sortBy, amount: '3000', fiatBalance: undefined } }
        ];
        const sorted = [...arrayToSort].sort(sortAssets);
        expect(sorted).toEqual([arrayToSort[2], arrayToSort[1], arrayToSort[0]]);
      });
    });

    describe('by metadata name third', () => {
      test('sorts in ascending order', () => {
        const arrayToSort: AssetSortBy[] = [
          { sortBy: { ...tokenA.sortBy, metadataName: 'Y', amount: '2000', fiatBalance: 2000 } },
          { sortBy: { ...tokenB.sortBy, metadataName: 'Z', amount: '2000', fiatBalance: 2000 } },
          { sortBy: { ...tokenC.sortBy, metadataName: 'X', amount: '2000', fiatBalance: 2000 } }
        ];
        const sorted = [...arrayToSort].sort(sortAssets);
        expect(sorted).toEqual([arrayToSort[2], arrayToSort[0], arrayToSort[1]]);
      });
      test('sorts with undefined last', () => {
        const arrayToSort: AssetSortBy[] = [
          { sortBy: { ...tokenA.sortBy, metadataName: undefined, amount: undefined, fiatBalance: undefined } },
          { sortBy: { ...tokenB.sortBy, metadataName: 'Z', amount: undefined, fiatBalance: undefined } },
          { sortBy: { ...tokenC.sortBy, metadataName: 'X', amount: undefined, fiatBalance: undefined } }
        ];
        const sorted = [...arrayToSort].sort(sortAssets);
        expect(sorted).toEqual([arrayToSort[2], arrayToSort[1], arrayToSort[0]]);
      });
    });

    describe('by fingerprint last', () => {
      test('sorts in ascending order', () => {
        const arrayToSort: AssetSortBy[] = [
          {
            sortBy: {
              ...tokenA.sortBy,
              fingerprint: Wallet.Cardano.AssetFingerprint('asset1pkpwyknlvul7az0xx8czhl60pyel45rpje4z8w')
            }
          },
          {
            sortBy: {
              ...tokenA.sortBy,
              fingerprint: Wallet.Cardano.AssetFingerprint('asset1s3yhz885gnyu2wcpz5h275u37hw3axz3c9sfqu')
            }
          },
          {
            sortBy: {
              ...tokenA.sortBy,
              fingerprint: Wallet.Cardano.AssetFingerprint('asset1cvmyrfrc7lpht2hcjwr9lulzyyjv27uxh3kcz0')
            }
          }
        ];
        const sorted = [...arrayToSort].sort(sortAssets);
        expect(sorted).toEqual([arrayToSort[2], arrayToSort[0], arrayToSort[1]]);
      });
    });
  });

  describe('getTotalWalletBalance', () => {
    const tokenPrices: TokenPrices = new Map();
    const tokenBalances: Wallet.Cardano.TokenMap = new Map();
    const assetsInfo: Wallet.Assets = new Map();
    const mockTokens = {
      // 10 tokens * 200 = 2000 ADA
      '659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c41': {
        tokenPrice: { lastFetchTime: 0, price: { priceInAda: 200, priceVariationPercentage24h: 0.7 } },
        balance: BigInt(10),
        assetInfo: { tokenMetadata: {} } as Wallet.Asset.AssetInfo // No decimals, but metadata available
      },
      // 1 token * 1000 = 1000 ADA
      b0d07d45fe9514f80213f4020e5a61241458be626841cde717cb38a76e7574636f696e: {
        tokenPrice: { lastFetchTime: 0, price: { priceInAda: 1000, priceVariationPercentage24h: 0.7 } },
        balance: BigInt(1_000_000),
        assetInfo: { tokenMetadata: { decimals: 6 } } as Wallet.Asset.AssetInfo
      },
      // 5 tokens * 100 = 500 ADA
      '6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7': {
        tokenPrice: { lastFetchTime: 0, price: { priceInAda: 100, priceVariationPercentage24h: 0.7 } },
        balance: BigInt(5000),
        assetInfo: { tokenMetadata: { decimals: 3 } } as Wallet.Asset.AssetInfo
      }
      // Total tokens balance in ADA = 3500 ADA
    };

    beforeEach(() => {
      tokenPrices.clear();
      tokenBalances.clear();
      assetsInfo.clear();
      for (const [assetId, value] of Object.entries(mockTokens)) {
        tokenPrices.set(Wallet.Cardano.AssetId(assetId), value.tokenPrice);
        tokenBalances.set(Wallet.Cardano.AssetId(assetId), value.balance);
        assetsInfo.set(Wallet.Cardano.AssetId(assetId), value.assetInfo);
      }
    });

    test(
      'calculates total wallet balance by multiplying the total tokens in ADA by the fiat price' +
        ' and adding it to the ADA in fiat balance',
      () => {
        const adaInFiatBalance = 200;
        const totalTokensInAda = 3500; // Check comments in mockTokens
        const coinPriceInFiat = 2;
        const expectedFormula = totalTokensInAda * coinPriceInFiat + adaInFiatBalance;
        expect(
          getTotalWalletBalance(adaInFiatBalance.toString(), tokenPrices, tokenBalances, coinPriceInFiat, assetsInfo)
        ).toEqual(expectedFormula.toString());
      }
    );

    test('returns only ADA in fiat balance if no tokens in balance, no token prices or no assets info', () => {
      expect(getTotalWalletBalance('200', tokenPrices, undefined, 0.2, assetsInfo)).toEqual('200');
      expect(getTotalWalletBalance('200', undefined, tokenBalances, 0.2, assetsInfo)).toEqual('200');
      expect(getTotalWalletBalance('200', tokenPrices, tokenBalances, 0.2, new Map())).toEqual('200');
    });

    test('does not add the balance for tokens that have missing metadata', () => {
      assetsInfo.delete(
        Wallet.Cardano.AssetId('b0d07d45fe9514f80213f4020e5a61241458be626841cde717cb38a76e7574636f696e')
      );
      expect(getTotalWalletBalance('200', tokenPrices, tokenBalances, 2, assetsInfo)).toEqual('5200'); // 2500 * 2 + 200
    });
  });
});
