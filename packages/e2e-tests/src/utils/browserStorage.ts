import extensionUtils from './utils';
import { Logger } from '../support/logger';
import networkManager from './networkManager';
import { expect } from 'chai';

const verifyBrowserStorageSupport: any = async () => {
  const currentBrowser = await extensionUtils.getBrowser();
  if (currentBrowser.includes('chrome') || currentBrowser.includes('msedge')) {
    return Promise.resolve();
  }
  return Promise.reject('Unsupported browser');
};

export const getBackgroundStorage: any = async () => {
  await verifyBrowserStorageSupport();

  try {
    return await browser.execute(
      'const response = await chrome.storage.local.get("BACKGROUND_STORAGE"); return response.BACKGROUND_STORAGE;',
      []
    );
  } catch (error) {
    throw new Error(`Getting browser storage failed: ${error}`);
  }
};

export const getBackgroundStorageItem: any = async (key: string) => {
  const backgroundStorage = await getBackgroundStorage();
  return JSON.stringify(backgroundStorage[key]);
};

export const setBackgroundStorage = async (data: Record<string, unknown>): Promise<void> => {
  await verifyBrowserStorageSupport();

  const backgroundStorage = await getBackgroundStorage();
  const updatedBackgroundStorage = { ...backgroundStorage, ...data };
  try {
    await browser.execute(
      `await chrome.storage.local.set({ BACKGROUND_STORAGE: ${JSON.stringify(updatedBackgroundStorage)}})`,
      []
    );
    await browser.execute("await chrome.storage.local.set({ MIGRATION_STATE: { state: 'up-to-date' } })", []);
  } catch (error) {
    throw new Error(`Setting browser storage failed: ${error}`);
  }
};

export const setMigrationState = async (): Promise<void> => {
  await verifyBrowserStorageSupport();
  try {
    await browser.execute("await chrome.storage.local.set({ MIGRATION_STATE: { state: 'up-to-date' } })", []);
  } catch (error) {
    throw new Error(`Setting browser storage failed: ${error}`);
  }
};

export const cleanBrowserStorage: any = async (): Promise<void> => {
  await verifyBrowserStorageSupport();

  try {
    await browser.execute('await chrome.storage.local.clear();', []);
  } catch (error) {
    throw new Error(`Clearing browser storage failed: ${error}`);
  }
};

export const clearBackgroundStorageKey: any = async (): Promise<void> => {
  await verifyBrowserStorageSupport();
  try {
    await browser.execute('await chrome.storage.local.remove("BACKGROUND_STORAGE");', []);
  } catch (error) {
    Logger.warn(`Clearing background storage key failed: ${error}`);
  }
};

export const deleteFiatPriceFromBrowserStorage = async (): Promise<void> => {
  const backgroundStorage = await getBackgroundStorage();
  delete backgroundStorage.fiatPrices;
  try {
    await browser.execute(
      `await chrome.storage.local.set({ BACKGROUND_STORAGE: ${JSON.stringify(backgroundStorage)}})`,
      []
    );
  } catch (error) {
    throw new Error(`Setting browser storage failed: ${error}`);
  }
};

export const confirmFiatPricesAreInLocalStorage = async (): Promise<void> => {
  const fiatPrices = await getBackgroundStorageItem('fiatPrices');
  if (!fiatPrices) await networkManager.waitForPricesToBeFetched();
  expect(fiatPrices, 'ADA Fiat price is not in local storage').is.not.undefined;
};
