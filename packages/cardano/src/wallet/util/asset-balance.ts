import { Asset } from '@cardano-sdk/core';
import BigNumber from 'bignumber.js';

const BASE = 10;

/**
  This function provides a decimal value when assetInfo is undefined.
 */
const getPlaceholderDecimal = (value: string) => {
  if (!Number(value)) return 0;

  const decimals = value?.split('.')[1]?.length;
  return decimals ? decimals : 0;
};

export const calculateAssetBalance = (balance: bigint | string, assetInfo: Asset.AssetInfo): string => {
  const decimals = assetInfo?.tokenMetadata?.decimals;
  if (!decimals) return balance.toString();

  return new BigNumber(balance.toString()).div(new BigNumber(BASE).pow(decimals)).toString();
};

export const assetBalanceToBigInt = (balanceWithDecimals: string, assetInfo: Asset.AssetInfo): bigint => {
  const tokenMetadataDecimals = assetInfo?.tokenMetadata?.decimals;
  const decimals = tokenMetadataDecimals ? tokenMetadataDecimals : getPlaceholderDecimal(balanceWithDecimals);

  if (!decimals) return BigInt(balanceWithDecimals);

  return BigInt(new BigNumber(balanceWithDecimals).times(new BigNumber(BASE).pow(decimals)).toFixed(0).toString());
};
