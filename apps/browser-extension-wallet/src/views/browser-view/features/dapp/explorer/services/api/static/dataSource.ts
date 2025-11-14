import dataCache from './dapp-explorer-data-cache.json';

const CATEGORIES_URL = '/categories';
const DAPPS_URL = '/dapps';

type DAppRadarDataEntry<T> = {
  data: T;
  timestamp: number;
};

export type DAppRadarDappItem = {
  dappId: number;
  name: string;
  description: string;
  fullDescription: string;
  logo: string;
  website: string;
  chains: string[];
  categories: string[];
  socialLinks: Array<{
    title: string;
    type: string;
    url: string;
  }>;
  metrics: {
    transactions: number;
    transactionsPercentageChange: number;
    uaw: number;
    uawPercentageChange: number;
    volume: number;
    volumePercentageChange: number;
    balance: number;
    balancePercentageChange: number;
  };
  tags: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
};

const categoriesEntry = dataCache[CATEGORIES_URL] as DAppRadarDataEntry<string[]> | undefined;
const dappsEntry = dataCache[DAPPS_URL] as DAppRadarDataEntry<DAppRadarDappItem[]> | undefined;

export const getCachedCategories = (): string[] => categoriesEntry?.data ?? [];

export const getCachedDapps = (): DAppRadarDappItem[] => dappsEntry?.data ?? [];
