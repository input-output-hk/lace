export type CoinGeckoPriceData = {
  price: number;
  change24h: number;
  priceInUsd?: number;
};

export type CoinGeckoCoinEntry = {
  id: string;
  symbol: string;
  name: string;
  platforms: Record<string, string>;
};

export type CoinGeckoCoinsList = CoinGeckoCoinEntry[];
