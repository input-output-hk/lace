import { AxiosInstance } from 'axios';
import { FetchResponse, useFetchApi } from './useFetchApi';

// We could have some sort of url builder to opt for different APIs like CMC in the future
const COINGECKO_API = {
  BASE_URL: 'https://api.coingecko.com/api/v3',
  SIMPLE_PRICE: 'simple/price'
};
type PriceQueryParams = {
  ids: string;
  vsCurrencies: string;
  includeLastUpdatedAt: boolean;
};
const getPriceUrl = (args: PriceQueryParams) => {
  const { ids, vsCurrencies, includeLastUpdatedAt } = args;
  const endpointUrl = `${COINGECKO_API.BASE_URL}/${COINGECKO_API.SIMPLE_PRICE}`;
  const queryString = `?ids=${ids}&vs_currencies=${vsCurrencies}&include_last_updated_at=${includeLastUpdatedAt}`;
  return endpointUrl.concat(queryString);
};

export type PriceDataResponse = {
  cardano: {
    usd: number;
    // eslint-disable-next-line camelcase
    last_updated_at: number;
  };
};

interface PriceFetcherArgs {
  axiosInstance: AxiosInstance;
  coinId?: string;
  currency?: string;
}

export const usePriceFetcher = (args: PriceFetcherArgs): FetchResponse<PriceDataResponse> => {
  const { axiosInstance } = args;
  const coinId = args.coinId ?? 'cardano';
  const currency = args.currency ?? 'usd';
  const params: PriceQueryParams = {
    ids: coinId,
    vsCurrencies: currency,
    includeLastUpdatedAt: true
  };
  return useFetchApi<PriceDataResponse>({ axiosInstance, url: getPriceUrl(params) });
};
