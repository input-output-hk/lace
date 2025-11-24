import BigNumber from 'bignumber.js';
import { Wallet } from '@lace/cardano';
import { TokenPrices } from '@lib/scripts/types';
import { AssetSortBy } from './types';
import { getTokenAmountInFiat } from '@src/utils/assets-transformers';

// eslint-disable-next-line complexity, sonarjs/cognitive-complexity
export const sortAssets = ({ sortBy: tokenA }: AssetSortBy, { sortBy: tokenB }: AssetSortBy): number => {
  // 1. order by Fiat Balance (desc)
  if (tokenA.fiatBalance !== undefined && tokenB.fiatBalance === undefined) return -1;
  if (tokenA.fiatBalance === undefined && tokenB.fiatBalance !== undefined) return 1;
  if (tokenA.fiatBalance !== tokenB.fiatBalance) return tokenB.fiatBalance - tokenA.fiatBalance;

  // 2. order by token Balance (desc)
  if (tokenA.amount !== undefined && tokenB.amount === undefined) return -1;
  if (tokenA.amount === undefined && tokenB.amount !== undefined) return 1;
  const BigNumberTokenA = new BigNumber(tokenA.amount);
  const BigNumberTokenB = new BigNumber(tokenB.amount);

  if (tokenA.amount !== undefined && tokenB.amount !== undefined && !BigNumberTokenA.isEqualTo(BigNumberTokenB))
    return BigNumberTokenB.minus(BigNumberTokenA).isLessThan(0) ? -1 : 1;

  // 3. order by Metadata Name (asc) if same amount
  if (tokenA.metadataName !== undefined && tokenB.metadataName === undefined) return -1;
  if (tokenA.metadataName === undefined && tokenB.metadataName !== undefined) return 1;
  if (tokenA.metadataName > tokenB.metadataName) return 1;
  if (tokenA.metadataName < tokenB.metadataName) return -1;

  // 4. order by Fingerprint (asc) if same Metadata Name
  if (tokenA.fingerprint > tokenB.fingerprint) return 1;
  if (tokenA.fingerprint < tokenB.fingerprint) return -1;

  return 0;
};

export const getTotalWalletBalance = (
  coinBalanceInFiat: string,
  tokenPrices: TokenPrices,
  tokenBalances: Wallet.Cardano.TokenMap,
  coinPriceInFiat: number,
  assetsInfo: Wallet.Assets
): string => {
  if (!tokenBalances) return coinBalanceInFiat;
  const totalTokenBalanceInFiat = tokenPrices
    ? [...tokenPrices.entries()].reduce((total, [key, { price }]) => {
        if (!price) return total;

        const { priceInAda } = price;
        const balance = tokenBalances?.get(key);
        const info = assetsInfo?.get(key);
        if (info?.tokenMetadata !== undefined && balance) {
          const formatedBalance = Wallet.util.calculateAssetBalance(balance, info);
          const balanceInFiat = getTokenAmountInFiat(formatedBalance, priceInAda, coinPriceInFiat);
          return total.plus(balanceInFiat);
        }

        return total;
      }, new BigNumber(0))
    : new BigNumber(0);

  return totalTokenBalanceInFiat.plus(coinBalanceInFiat).toString();
};
