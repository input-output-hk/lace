import dataCache from './dapp-explorer-data-cache.json';

const CATEGORIES_URL = '/categories';
const DAPPS_URL = '/dapps';

/**
 * Resolves a logo path to the correct URL for use in the browser extension.
 * Handles both relative paths (for local assets) and absolute URLs.
 */
export const getLogoUrl = (logoPath: string): string => {
  // If it's already an absolute URL (http/https), return as-is
  if (logoPath.startsWith('http://') || logoPath.startsWith('https://')) {
    return logoPath;
  }

  // If it's a data URI, return as-is
  if (logoPath.startsWith('data:')) {
    return logoPath;
  }

  // For relative paths, use chrome.runtime.getURL if available (extension context)
  // Otherwise, use the path as-is (webpack will resolve it)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chromeRuntime = (globalThis as any).chrome?.runtime || (window as any).chrome?.runtime;
    if (chromeRuntime?.getURL && typeof chromeRuntime.getURL === 'function') {
      // Remove leading ./ if present
      const cleanPath = logoPath.replace(/^\.\//, '');
      return chromeRuntime.getURL(cleanPath);
    }
  } catch {
    // Ignore errors if chrome is not available
  }

  // Fallback: return the path as-is (for non-extension contexts or webpack dev server)
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
