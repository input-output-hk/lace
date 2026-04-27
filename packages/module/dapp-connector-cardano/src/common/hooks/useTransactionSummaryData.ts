import { useMemo } from 'react';

import {
  calculateNetBalance,
  constructTokenId,
  formatAssetAmount,
  getAssetDisplayInfo,
  getTransactionType,
  type TokensMetadataMap,
  type TransactionType,
} from '../utils';
import { calculateAdaFiatValue } from '../utils/sign-tx-utils';
import { formatLovelaceToAda } from '../utils/transaction-inspector';

import type { TokenTransferValue } from './useTransactionSummary';
import type { Cardano } from '@cardano-sdk/core';
import type { TokenPrice, TokenPriceId } from '@lace-contract/token-pricing';

export interface AssetProperties {
  formattedAmount: string;
  symbol: string;
  imageUrl?: string;
  isNft: boolean;
  isPositive: boolean;
}

export interface UseTransactionSummaryDataParams {
  fromAddresses: Map<Cardano.PaymentAddress, TokenTransferValue>;
  toAddresses: Map<Cardano.PaymentAddress, TokenTransferValue>;
  ownAddresses: string[];
  tokensMetadata?: TokensMetadataMap;
  coinSymbol: string;
  tokenPrices?: Record<TokenPriceId, TokenPrice>;
  currencyTicker?: string;
}

export interface UseTransactionSummaryDataResult {
  transactionType: TransactionType;
  formattedNetCoinBalance: string;
  isNetCoinPositive: boolean;
  assetList: AssetProperties[];
  coinSymbol: string;
  formattedFiatNetCoinBalance: string | undefined;
}

const calculateNetAssetBalances = (
  fromAddresses: Map<Cardano.PaymentAddress, TokenTransferValue>,
  toAddresses: Map<Cardano.PaymentAddress, TokenTransferValue>,
  ownAddresses: string[],
): Array<[Cardano.AssetId, bigint]> => {
  const assetMap = new Map<Cardano.AssetId, bigint>();

  for (const [address, value] of fromAddresses) {
    if (ownAddresses.includes(address)) {
      for (const [assetId, amount] of value.assets) {
        const existing = assetMap.get(assetId) ?? BigInt(0);
        assetMap.set(assetId, existing - amount);
      }
    }
  }

  for (const [address, value] of toAddresses) {
    if (ownAddresses.includes(address)) {
      for (const [assetId, amount] of value.assets) {
        const existing = assetMap.get(assetId) ?? BigInt(0);
        assetMap.set(assetId, existing + amount);
      }
    }
  }

  return [...assetMap.entries()].filter(([, amount]) => amount !== BigInt(0));
};

const getAssetProperties = (
  assetId: Cardano.AssetId,
  amount: bigint,
  tokensMetadata?: TokensMetadataMap,
): AssetProperties => {
  const tokenId = constructTokenId(assetId);
  const metadata = tokensMetadata?.[tokenId];
  const displayInfo = getAssetDisplayInfo(assetId, metadata);
  const absoluteAmount = amount < BigInt(0) ? -amount : amount;
  const formattedAmount = formatAssetAmount(
    absoluteAmount,
    displayInfo.decimals,
  );

  return {
    formattedAmount,
    symbol: displayInfo.ticker,
    imageUrl: displayInfo.image,
    isNft: displayInfo.isNft,
    isPositive: amount > BigInt(0),
  };
};

export const useTransactionSummaryData = ({
  fromAddresses,
  toAddresses,
  ownAddresses,
  tokensMetadata,
  coinSymbol,
  tokenPrices,
  currencyTicker,
}: UseTransactionSummaryDataParams): UseTransactionSummaryDataResult => {
  const netCoinBalance = useMemo(
    () => calculateNetBalance(fromAddresses, toAddresses, ownAddresses),
    [fromAddresses, toAddresses, ownAddresses],
  );

  const netAssetBalances = useMemo(
    () => calculateNetAssetBalances(fromAddresses, toAddresses, ownAddresses),
    [fromAddresses, toAddresses, ownAddresses],
  );

  const transactionType = useMemo(
    () => getTransactionType(netCoinBalance),
    [netCoinBalance],
  );

  const formattedNetCoinBalance = useMemo(() => {
    const absoluteBalance =
      netCoinBalance < BigInt(0) ? -netCoinBalance : netCoinBalance;
    const formatted = formatLovelaceToAda(absoluteBalance);
    return netCoinBalance < BigInt(0) ? `-${formatted}` : formatted;
  }, [netCoinBalance]);

  const formattedFiatNetCoinBalance = useMemo(
    () => calculateAdaFiatValue(netCoinBalance, tokenPrices, currencyTicker),
    [netCoinBalance, tokenPrices, currencyTicker],
  );

  const assetList = useMemo(
    () =>
      netAssetBalances.map(([assetId, amount]) =>
        getAssetProperties(assetId, amount, tokensMetadata),
      ),
    [netAssetBalances, tokensMetadata],
  );

  return {
    transactionType,
    formattedNetCoinBalance,
    isNetCoinPositive: netCoinBalance > BigInt(0),
    assetList,
    coinSymbol,
    formattedFiatNetCoinBalance,
  };
};
