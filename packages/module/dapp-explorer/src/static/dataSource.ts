import { logoAssets } from './assets';
import dataCache from './dapp-explorer-data-cache.json';

const CATEGORIES_URL = '/categories';
const DAPPS_URL = '/dapps';

/**
 * Resolves a logo path to a renderable URI.
 * Bundled assets are stored as base64 data URIs, bypassing
 * platform-specific native asset resolution entirely.
 */
export const getLogoUrl = (logoPath: string): string => {
  if (logoPath.startsWith('assets/')) {
    const filename = logoPath.replace('assets/', '');
    return logoAssets[filename] ?? logoPath;
  }
  return logoPath;
};

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
  isActive: boolean;
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

const categoriesEntry = dataCache[CATEGORIES_URL] as
  | DAppRadarDataEntry<string[]>
  | undefined;
const dappsEntry = dataCache[DAPPS_URL] as
  | DAppRadarDataEntry<DAppRadarDappItem[]>
  | undefined;

export const getCachedCategories = (
  disallowedCategories: string[] = [],
): string[] => {
  const categories = categoriesEntry?.data ?? [];
  if (disallowedCategories.length === 0) return categories;

  const disallowed = new Set(disallowedCategories.map(value => value.trim()));
  return categories.filter(category => !disallowed.has(category));
};

export const getCachedDapps = (
  disallowedDapps: Record<string, number[]> = {},
): DAppRadarDappItem[] => {
  const dapps = dappsEntry?.data ?? [];
  const disallowedIds = Object.values(disallowedDapps).flat();
  if (disallowedIds.length === 0) return dapps;

  const excluded = new Set(disallowedIds);
  return dapps.filter(dapp => !excluded.has(dapp.dappId));
};
