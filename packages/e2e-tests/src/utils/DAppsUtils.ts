import LocalStorageManager from './localStorageManager';
import { DAppCategories } from '../types/dappCategories';
import { browser } from '@wdio/globals';

const STORAGE_KEY = 'dapp-explorer-data-cache';
// Values taken from PostHog
const DAppWithConnectivityIssues = new Set([27_302, 19_473, 19_796, 19_717, 18_803, 22_724, 20_115, 19_922]);
const disallowedCategories = ['gambling', 'high-risk'];

export const getDAppsFromLocalStorage = async (targetKey: string, limit: number): Promise<any[]> => {
  await browser.pause(1000);
  const rawData = await LocalStorageManager.getItem(STORAGE_KEY);
  if (!rawData) throw new Error(`No data found in localStorage for key: ${STORAGE_KEY}`);

  try {
    const parsedData = JSON.parse(rawData);
    const dapps = [];
    const dataEntry = parsedData[targetKey]?.data;

    for (const item of dataEntry) {
      if (
        !DAppWithConnectivityIssues.has(item.dappId) &&
        !disallowedCategories.some((cat) => item.categories.includes(cat))
      ) {
        dapps.push(item);
        if (dapps.length >= limit) {
          break;
        }
      }
    }

    return dapps;
  } catch (error) {
    throw new Error(`Error parsing localStorage data: ${error}`);
  }
};

export const getAllDAppNamesFromLocalStorage = async (): Promise<string[]> => {
  const targetKey = 'https://apis.dappradar.com/v2/dapps/top/uaw?chain=cardano&range=30d&top=100';
  const dapps = await getDAppsFromLocalStorage(targetKey, 100);
  return dapps.map((dapp) => String(dapp?.name));
};

export const getDAppNamesFromLocalStorageByCategory = async (category: DAppCategories): Promise<string[]> => {
  const targetKey = `https://apis.dappradar.com/v2/dapps/top/uaw?chain=cardano&range=30d&top=100&category=${category.toLowerCase()}`;
  const dapps = await getDAppsFromLocalStorage(targetKey, 100);
  return dapps.map((dapp) => String(dapp?.name));
};
