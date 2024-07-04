import BigNumber from 'bignumber.js';
import { Wallet } from '@lace/cardano';
import { AssetInputProps } from '@lace/core';
import { AssetInfo, SpentBalances } from '../../../types';
import { PriceResult } from '@hooks/useFetchCoinPrice';
import { CurrencyInfo } from '@src/types/local-storage';
import { getTokenAmountInFiat, parseFiat } from '@src/utils/assets-transformers';

/**
 * Calculates the maximum spendable amount of a token, given the total spendable balance, total spent, and current spending.
 *
 * Subtracts the total amount already spent (sum of current's and other input's values) from the token's total spendable balance
 * and adding the amount currently being spent (value from current input)
 *
 * @param totalSpendableBalance Total spendable balance of the token in the wallet
 * @param totalSpent The total amount that has been spent. (Includes current spending and other inputs)
 * @param currentSpending The current amount that is being spent. (Value from current input)
 * @returns The maximum amount that can be spent
 */
export const getMaxSpendableAmount = (totalSpendableBalance = '0', totalSpent = '0', currentSpending = '0'): string => {
  // currentSpending is the current input's value for the token we are calculating the max value
  // totalSpent is the sum of ALL input's values for the token including the current one
  // To get the max amount, first we need to subtract the current input's value from the totalSpent amount
  const spentElsewhere = new BigNumber(totalSpent).minus(currentSpending);
  // And then subtract that difference from the total spendable balance
  const maxSpendableAmount = new BigNumber(totalSpendableBalance).minus(spentElsewhere);
  return maxSpendableAmount.lte(0) || maxSpendableAmount.isNaN() ? '0' : maxSpendableAmount.toString();
};

type ADARow = {
  availableADA: string;
} & Pick<AssetInputProps, 'max' | 'allowFloat' | 'hasMaxBtn' | 'hasReachedMaxAmount'>;

/**
 * Gets the properties for ADA coin.
 *
 * @param balance The wallet's ADA balance in lovelaces.
 * @param spendableCoin The amount of coins that can be spent in lovelaces.
 * @param spentCoins The total amount of coins spent in ADA (including current input).
 * @param currentSpendingAmount The amount entered in the current input in ADA.
 */
export const getADACoinProperties = (
  balance: string,
  spendableCoin: string,
  spentCoins: string,
  currentSpendingAmount: string
): ADARow => {
  // Convert to ADA
  const availableADA = Wallet.util.lovelacesToAdaString(balance);
  const spendableCoinInAda = Wallet.util.lovelacesToAdaString(spendableCoin, undefined, BigNumber.ROUND_DOWN);
  // Calculate max amount in ADA
  const max = getMaxSpendableAmount(spendableCoinInAda, spentCoins, currentSpendingAmount);
  return {
    availableADA,
    max,
    allowFloat: true,
    hasMaxBtn: Number(availableADA) > 0,
    hasReachedMaxAmount: new BigNumber(spentCoins).gte(spendableCoinInAda)
  };
};

type AssetProperties = {
  allowFloat: boolean;
  hasReachedMaxAmount: boolean;
  maxDecimals: number;
  maxSpendableAmount: string;
  ticker: string;
  totalAssetBalance: string;
  totalAssetSpent: string;
};

/**
 * Get the properties of a native asset, with the amounts in ADA and formatted with decimals
 *
 * @param assetInputItem The asset input item information.
 * @param assetInfo The asset information including metadata.
 * @param assetBalances The wallet's balance for all assets.
 * @param tokensUsed All tokens already used in the transaction.
 */
export const getAssetProperties = (
  assetInputItem: AssetInfo,
  assetInfo: Wallet.Asset.AssetInfo,
  assetBalances: Wallet.Cardano.TokenMap,
  tokensUsed: SpentBalances
): AssetProperties => {
  const decimals = assetInfo?.tokenMetadata?.decimals;
  const ticker =
    assetInfo?.nftMetadata?.name ??
    assetInfo?.tokenMetadata?.ticker ??
    assetInfo?.tokenMetadata?.name ??
    assetInfo?.fingerprint.toString();

  // Wallet's asset balance
  const totalAssetBalance = assetBalances?.get(Wallet.Cardano.AssetId(assetInputItem.id)) || BigInt(0);
  // Sum of values from other inputs in tx building + current
  const totalAssetSpent = Wallet.util.assetBalanceToBigInt(tokensUsed[assetInputItem.id] || '0', assetInfo);
  // Value of current input
  const currentInputValue = Wallet.util.assetBalanceToBigInt(assetInputItem.value || '0', assetInfo);
  const maxSpendableAmount = getMaxSpendableAmount(
    totalAssetBalance.toString(),
    totalAssetSpent.toString(),
    currentInputValue.toString()
  );

  return {
    allowFloat: decimals > 0,
    hasReachedMaxAmount: totalAssetSpent >= totalAssetBalance,
    maxDecimals: decimals > 0 ? decimals : 0,
    maxSpendableAmount: Wallet.util.calculateAssetBalance(BigInt(maxSpendableAmount), assetInfo),
    ticker,
    totalAssetBalance: Wallet.util.calculateAssetBalance(totalAssetBalance, assetInfo),
    totalAssetSpent: Wallet.util.calculateAssetBalance(totalAssetSpent, assetInfo)
  };
};
/**
 * Get an asset input value in fiat.
 *
 * @param assetInputItem The asset input item information.
 * @param assetInfo The asset information including metadata.
 * @param prices Tokens' prices in fiat.
 * @param fiatCurrency The current fiat currency.
 * @returns The asset input value in fiat.
 */
export const getAssetFiatValue = (
  assetInputItem: AssetInfo,
  assetInfo: Wallet.Asset.AssetInfo,
  prices: PriceResult,
  fiatCurrency: CurrencyInfo
): string => {
  const tokenPriceInAda = prices?.tokens?.get(Wallet.Cardano.AssetId(assetInputItem.id))?.priceInAda;
  return assetInfo?.tokenMetadata !== undefined && tokenPriceInAda && prices?.cardano?.price
    ? `= ${
        assetInputItem?.value
          ? parseFiat(Number(getTokenAmountInFiat(assetInputItem?.value, tokenPriceInAda, prices?.cardano?.price)))
          : '0'
      } ${fiatCurrency?.code}`
    : '-';
};
