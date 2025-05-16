import { Wallet } from '@lace/cardano';
import {
  AssetInfo,
  CardanoOutput,
  OutputList,
  SpentBalances,
  TemporaryTransactionDataKeys,
  TemporaryTransactionData,
  TokenAnalyticsProperties
} from './types';
import BigNumber from 'bignumber.js';
import isNil from 'lodash/isNil';
import { isNFT } from '@src/utils/is-nft';
import flatMapDeep from 'lodash/flatMapDeep';
import { CardanoTxOut, CurrencyInfo, TokensDetails } from '@types';
import { PriceResult } from '@hooks';
import { SentAssetsList } from '@lace/core';
import { walletBalanceTransformer } from '@src/api/transformers';
import isUndefined from 'lodash/isUndefined';
import { getTokenAmountInFiat, parseFiat } from '@utils/assets-transformers';

type Unpacked<T> = T extends (infer U)[] ? U : T;
type AssetsListItem = Unpacked<SentAssetsList>;

export const calculateSpentBalance = (outputs: OutputList): SpentBalances => {
  let spentBalances: Record<string, string> = {};
  const values = Object.values(outputs);

  for (const { assets } of values) {
    for (const asset of assets) {
      const balance = spentBalances[asset.id] || '0';
      const sum = new BigNumber(balance.toString()).plus(asset?.value || '0');
      spentBalances = { ...spentBalances, [asset.id]: sum.isNaN() ? '0' : sum.toString() };
    }
  }

  return spentBalances;
};

export const getOutputValues = (assets: Array<AssetInfo>, cardanoCoin: Wallet.CoinId): CardanoOutput['value'] => {
  const assetsMap = new Map();
  let coins = '0';

  for (const info of assets) {
    if (cardanoCoin.id === info.id) {
      coins = Wallet.util.adaToLovelacesString(info.value || '0');
    } else {
      try {
        if (info.value && Number(info.value) && !Number.isNaN(Number(info.value))) {
          assetsMap.set(Wallet.Cardano.AssetId(info.id), info.value);
        }
      } catch {
        // If asset is invalid don't set currentCoin
      }
    }
  }

  return {
    coins,
    assets: assetsMap.size === 0 ? undefined : assetsMap
  };
};

export const getNextInsufficientBalanceInputs =
  (lastFocusedInput: string, reachedMaxAmountList: Set<string | Wallet.Cardano.AssetId>, id: string) =>
  (prevInputsList: string[]): string[] => {
    const isInMaxAmountList = reachedMaxAmountList.has(id); // check the if the id exists in reachedMaxAmountList
    const isInInsufficientBalanceList = prevInputsList.includes(lastFocusedInput); // check the if input element id exists in insufficient balance list

    // check if the last focused element has insufficient balance and doesn't exists in insufficient balance list
    if (isInMaxAmountList && !isInInsufficientBalanceList) {
      return [...prevInputsList, lastFocusedInput]; // add it to the insufficient balance list
      // check if the last focused element has balance and exists in insufficient balance list
    } else if (!isInMaxAmountList && isInInsufficientBalanceList) {
      return prevInputsList.filter((inputId) => inputId.split('.')[1] !== id); // remove all items with same coin id (cardano id or asset id)
    }

    return prevInputsList;
  };

export const hasReachedMaxAmountAda = ({
  tokensUsed,
  balance,
  exceed = false,
  cardanoCoin,
  availableRewards = BigInt(0)
}: {
  tokensUsed: SpentBalances;
  balance: Wallet.Cardano.Lovelace;
  exceed?: boolean;
  cardanoCoin: Wallet.CoinId;
  availableRewards?: bigint;
}): boolean =>
  tokensUsed[cardanoCoin.id] && balance
    ? new BigNumber(tokensUsed[cardanoCoin.id])[exceed ? 'gt' : 'gte'](
        Wallet.util.lovelacesToAdaString((BigInt(balance) + BigInt(availableRewards)).toString())
      )
    : false;

export const getReachedMaxAmountList = ({
  assets = new Map(),
  tokensUsed,
  balance,
  exceed = false,
  cardanoCoin,
  availableRewards = BigInt(0)
}: {
  assets: Wallet.Assets;
  tokensUsed: SpentBalances;
  balance: Wallet.Cardano.Value;
  exceed?: boolean;
  cardanoCoin: Wallet.CoinId;
  availableRewards?: bigint;
}): (string | Wallet.Cardano.AssetId)[] => {
  const reachedMaxAmountAda = hasReachedMaxAmountAda({
    tokensUsed,
    balance: balance?.coins,
    cardanoCoin,
    availableRewards
  });

  const reachedMaxAmountAssets = balance?.assets?.size
    ? [...balance.assets]
        .filter(([id, value]) => {
          if (tokensUsed[id.toString()]) {
            const balanceInBigInt = Wallet.util.assetBalanceToBigInt(tokensUsed[id.toString()], assets.get(id));
            return exceed ? balanceInBigInt > value : balanceInBigInt >= value;
          }

          return false;
        })
        .map(([id]) => id)
    : [];

  return reachedMaxAmountAda ? [...reachedMaxAmountAssets, cardanoCoin.id] : reachedMaxAmountAssets;
};

/**
 * Saves temporary transaction data to localStorage.
 * @param data The temporary transaction data to save in storage.
 */
export const saveTemporaryTxDataInStorage = ({
  tempAddress,
  tempOutputs,
  tempSource
}: Partial<TemporaryTransactionData>): void => {
  if (!isNil(tempAddress)) localStorage.setItem(TemporaryTransactionDataKeys.TEMP_ADDRESS, tempAddress);
  if (!isNil(tempOutputs)) localStorage.setItem(TemporaryTransactionDataKeys.TEMP_OUTPUTS, JSON.stringify(tempOutputs));
  if (!isNil(tempSource)) localStorage.setItem(TemporaryTransactionDataKeys.TEMP_SOURCE, tempSource);
};

/**
 * Gets temporary transaction data from localStorage.
 * @returns The temporary transaction data saved in storage. Returns `null` for each key that is not available
 */
export const getTemporaryTxDataFromStorage = (): TemporaryTransactionData => {
  const tempAddress = localStorage.getItem(TemporaryTransactionDataKeys.TEMP_ADDRESS);
  const tempOutputs = localStorage.getItem(TemporaryTransactionDataKeys.TEMP_OUTPUTS);
  const tempSource = localStorage.getItem(TemporaryTransactionDataKeys.TEMP_SOURCE);

  return {
    tempAddress,
    tempSource: tempSource as TemporaryTransactionData['tempSource'] | null,
    tempOutputs: !isNil(tempOutputs) ? JSON.parse(tempOutputs) : tempOutputs
  };
};

/**
 * Clears temporary transaction data from localStorage.
 * @param args An array of keys to clear. If no array is provided, **ALL** keys will be cleared.
 */
export const clearTemporaryTxDataFromStorage = (args?: (keyof TemporaryTransactionData)[]): void => {
  if (!args || args.includes(TemporaryTransactionDataKeys.TEMP_ADDRESS)) {
    localStorage.removeItem(TemporaryTransactionDataKeys.TEMP_ADDRESS);
  }
  if (!args || args.includes(TemporaryTransactionDataKeys.TEMP_OUTPUTS)) {
    localStorage.removeItem(TemporaryTransactionDataKeys.TEMP_OUTPUTS);
  }
  if (!args || args.includes(TemporaryTransactionDataKeys.TEMP_SOURCE)) {
    localStorage.removeItem(TemporaryTransactionDataKeys.TEMP_SOURCE);
  }
};

const getCardanoCoinAnalyticsProperties = (cardanoCoin: Wallet.CoinId, amount: string) => ({
  id: cardanoCoin.id,
  name: cardanoCoin.name,
  ticker: cardanoCoin.symbol,
  amount
});

const getAssetAnalyticsProperties = (assetsMap: Wallet.Assets, id: string, amount: string) => {
  const info = assetsMap.get(Wallet.Cardano.AssetId(id));
  const name = isNFT(info) ? info?.nftMetadata?.name : info?.tokenMetadata?.name;
  const ticker = info?.tokenMetadata?.ticker;
  return { id: info?.fingerprint, amount, name, ticker };
};

export const getTokensProperty = (
  outputs: OutputList,
  assetsMap: Wallet.Assets,
  cardanoCoin: Wallet.CoinId
): TokenAnalyticsProperties[] => {
  const tokensAnalyticsPropertyMap = new Map<string, TokenAnalyticsProperties>();
  // gets an array of assets sent in each tx output
  const sentAssets = Object.values(outputs).map(({ assets }) => assets);
  // flat the array
  const flattedSentAssets = flatMapDeep(sentAssets);

  for (const { id: key, value } of flattedSentAssets) {
    const tokensAnalyticsProperty = tokensAnalyticsPropertyMap.get(key);

    if (tokensAnalyticsProperty) {
      // if the token exists in the property map, add the amount to the current amount in the map
      const amount = new BigNumber(tokensAnalyticsProperty.amount).plus(value).toString();
      tokensAnalyticsPropertyMap.set(key, { ...tokensAnalyticsProperty, amount });
    } else {
      // if the token don't exists in the property map, get the properties
      const properties =
        key === cardanoCoin.id
          ? getCardanoCoinAnalyticsProperties(cardanoCoin, value)
          : getAssetAnalyticsProperties(assetsMap, key, value);

      tokensAnalyticsPropertyMap.set(key, properties);
    }
  }
  return [...tokensAnalyticsPropertyMap.values()];
};

export const formatRow = ({
  output,
  assetInfo,
  cardanoCoin,
  fiatCurrency,
  prices
}: {
  output: CardanoTxOut;
  assetInfo: Map<Wallet.Cardano.AssetId, TokensDetails>;
  cardanoCoin: Wallet.CoinId;
  fiatCurrency: CurrencyInfo;
  prices?: PriceResult;
}): SentAssetsList => {
  const cardanoAmount = walletBalanceTransformer(output.value.coins.toString(), prices?.cardano?.price);

  const cardano: AssetsListItem = {
    assetAmount: `${cardanoAmount.coinBalance} ${cardanoCoin.symbol}`,
    fiatAmount: `${cardanoAmount.fiatBalance} ${fiatCurrency?.code}`
  };

  if (isUndefined(output.value.assets)) return [cardano];

  const mapEntries = [...output.value.assets.entries()];

  const assetList: SentAssetsList = [];
  for (const [id, balance] of mapEntries) {
    const asset = assetInfo?.get(id);
    if (asset) {
      const ticker = asset.nftMetadata?.name ?? asset.tokenMetadata?.ticker ?? asset.tokenMetadata?.name;
      const amount = Wallet.util.calculateAssetBalance(balance, asset);
      const tokenPriceInAda = prices?.cardano.getTokenPrice(id)?.priceInAda;
      const fiatAmount =
        asset.tokenMetadata !== undefined && tokenPriceInAda
          ? `${parseFiat(Number(getTokenAmountInFiat(amount, tokenPriceInAda, prices?.cardano?.price)))} ${
              fiatCurrency?.code
            }`
          : '-';

      assetList.push({
        assetAmount: `${amount} ${ticker ?? asset.assetId}`,
        fiatAmount
      });
    }
  }

  return [cardano, ...assetList];
};
