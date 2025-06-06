import { useMemo } from 'react';
import { logger, useObservable } from '@lace/common';
import { TokenPrices, StatusTypes, ADAPricesKeys, TokenPrice } from '@lib/scripts/types';
import { useBackgroundServiceAPIContext, useCurrencyStore } from '../providers';
import { CARDANO_COIN_SYMBOL } from '@src/utils/constants';
import { Wallet } from '@lace/cardano';
import { config } from '@src/config';
import { useWalletStore } from '@stores';

export interface PriceResult {
  cardano: {
    getTokenPrice: (assetId: Wallet.Cardano.AssetId, options?: { cacheOnly: boolean }) => TokenPrice | undefined;
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

const { TOKEN_PRICE_CHECK_INTERVAL } = config();
const alreadyRequestedPriceFrom = new Set<Wallet.Cardano.AssetId>();

export const useFetchCoinPrice = (): UseFetchCoinPrice => {
  const { coinPrices, trackCardanoTokenPrice } = useBackgroundServiceAPIContext();
  const { fiatCurrency } = useCurrencyStore();
  const tokenPrices = useObservable(coinPrices.tokenPrices$);
  const adaPrices = useObservable(coinPrices.adaPrices$);
  const bitcoinPrices = useObservable(coinPrices.bitcoinPrices$);
  const networkId = useWalletStore((state) => state.currentChain?.networkId);

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
      getTokenPrice: (
        assetId: Wallet.Cardano.AssetId,
        options: { cacheOnly?: boolean } = {}
      ): TokenPrice | undefined => {
        // track the price only for token in Cardano mainnet, otherwise just do nothing
        if (networkId !== Wallet.Cardano.NetworkId.Mainnet) return;
        const tokenPrice = tokenPrices?.tokens.get(assetId);
        if (options.cacheOnly) return;
        const trackPrice = () => trackCardanoTokenPrice(assetId).catch((error) => logger.error(error));

        // If the price for this token was never fetched, wee need to track it
        if (!tokenPrice) {
          if (alreadyRequestedPriceFrom.has(assetId)) return;
          alreadyRequestedPriceFrom.add(assetId);
          trackPrice();

          return undefined;
        }

        const { lastFetchTime, price } = tokenPrice;

        // If the price was fetched, but it is still not present, it means the price for this token is not tracked by CoinGecko:
        // let's retry a new fetch only after the TOKEN_PRICE_CHECK_INTERVAL to check if now the price is being tracked.
        if (!price && lastFetchTime < Date.now() - TOKEN_PRICE_CHECK_INTERVAL) trackPrice();

        // eslint-disable-next-line consistent-return
        return price;
      },
      price: isAdaCurrency ? 1 : adaPrices?.prices?.[fiatCurrency.code.toLowerCase() as ADAPricesKeys],
      priceVariationPercentage24h:
        adaPrices?.prices?.[`${fiatCurrency.code.toLowerCase()}_24h_change` as ADAPricesKeys] || 0
    }),
    [adaPrices?.prices, fiatCurrency.code, isAdaCurrency, tokenPrices?.tokens, trackCardanoTokenPrice, networkId]
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
