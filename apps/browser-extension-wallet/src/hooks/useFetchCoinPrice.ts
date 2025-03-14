import { useMemo } from 'react';
import { useObservable } from '@lace/common';
import { TokenPrices, StatusTypes, ADAPricesKeys } from '@lib/scripts/types';
import { useBackgroundServiceAPIContext, useCurrencyStore } from '../providers';
import { CARDANO_COIN_SYMBOL } from '@src/utils/constants';
import { Wallet } from '@lace/cardano';

export interface PriceResult {
  cardano: {
    price: number;
    priceVariationPercentage24h: number;
  };
  bitcoin: {
    price: number;
    priceVariationPercentage24h: number;
  };
  tokens: TokenPrices;
}

export interface UseFetchCoinPrice {
  priceResult: PriceResult;
  status: StatusTypes;
  timestamp?: number;
}

export const useFetchCoinPrice = (): UseFetchCoinPrice => {
  const backgroundServices = useBackgroundServiceAPIContext();
  const { fiatCurrency } = useCurrencyStore();
  const { coinPrices } = backgroundServices;
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

  const price = useMemo(
    () => ({
      price: isAdaCurrency ? 1 : adaPrices?.prices?.[fiatCurrency.code.toLowerCase() as ADAPricesKeys],
      priceVariationPercentage24h:
        adaPrices?.prices?.[`${fiatCurrency.code.toLowerCase()}_24h_change` as ADAPricesKeys] || 0
    }),
    [adaPrices?.prices, fiatCurrency.code, isAdaCurrency]
  );

  return useMemo(
    () => ({
      priceResult: {
        cardano: price,
        bitcoin: bitcoinPrice,
        tokens: tokenPrices?.tokens
      },
      status: adaPrices?.status,
      timestamp: adaPrices?.timestamp
    }),
    [tokenPrices, adaPrices, price, bitcoinPrice]
  );
};
