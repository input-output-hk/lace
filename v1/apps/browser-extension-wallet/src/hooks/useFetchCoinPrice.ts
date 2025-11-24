import { useMemo } from 'react';
import { useObservable } from '@lace/common';
import { TokenPrices, StatusTypes, ADAPricesKeys, TokenPrice } from '@lib/scripts/types';
import { useBackgroundServiceAPIContext, useCurrencyStore } from '../providers';
import { CARDANO_COIN_SYMBOL } from '@src/utils/constants';
import { Wallet } from '@lace/cardano';

export interface PriceResult {
  cardano: {
    getTokenPrice: (assetId: Wallet.Cardano.AssetId) => TokenPrice | undefined;
    price: number;
    priceVariationPercentage24h: number;
  };
  bitcoin: {
    price: number;
    priceVariationPercentage24h: number;
  };
  /** @deprecated Use `cardano.getTokenPrice` instead. */
  tokens: TokenPrices;
}

export interface UseFetchCoinPrice {
  priceResult: PriceResult;
  status: StatusTypes;
  timestamp?: number;
}

export const useFetchCoinPrice = (): UseFetchCoinPrice => {
  const { coinPrices } = useBackgroundServiceAPIContext();
  const { fiatCurrency } = useCurrencyStore();
  const tokenPrices = useObservable(coinPrices.tokenPrices$);
  const adaPrices = useObservable(coinPrices.adaPrices$);
  const bitcoinPrices = useObservable(coinPrices.bitcoinPrices$);

  const isAdaCurrency = fiatCurrency.code === CARDANO_COIN_SYMBOL[Wallet.Cardano.NetworkId.Mainnet];

  const bitcoinPrice = useMemo(
    () => ({
      price: bitcoinPrices?.prices?.[fiatCurrency.code.toLowerCase() as ADAPricesKeys],
      priceVariationPercentage24h:
        bitcoinPrices?.prices?.[`${fiatCurrency.code.toLowerCase()}_24h_change` as ADAPricesKeys] || 0
    }),
    [bitcoinPrices?.prices, fiatCurrency.code]
  );

  const cardano = useMemo(
    () => ({
      getTokenPrice: (assetId: Wallet.Cardano.AssetId): TokenPrice | undefined =>
        tokenPrices?.tokens.get(assetId)?.price,
      price: isAdaCurrency ? 1 : adaPrices?.prices?.[fiatCurrency.code.toLowerCase() as ADAPricesKeys],
      priceVariationPercentage24h:
        adaPrices?.prices?.[`${fiatCurrency.code.toLowerCase()}_24h_change` as ADAPricesKeys] || 0
    }),
    [adaPrices?.prices, fiatCurrency.code, isAdaCurrency, tokenPrices?.tokens]
  );

  return useMemo(
    () => ({
      priceResult: {
        cardano,
        bitcoin: bitcoinPrice,
        tokens: tokenPrices?.tokens
      },
      status: adaPrices?.status,
      timestamp: adaPrices?.timestamp
    }),
    [tokenPrices, adaPrices, cardano, bitcoinPrice]
  );
};
