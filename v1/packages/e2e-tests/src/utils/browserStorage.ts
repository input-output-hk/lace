import extensionUtils from './utils';
import { Logger } from '../support/logger';
import { browser } from '@wdio/globals';

const verifyBrowserStorageSupport: any = async () => {
  const currentBrowser = await extensionUtils.getBrowser();
  if (
    currentBrowser.includes('chrome') ||
    currentBrowser.includes('MicrosoftEdge') ||
    currentBrowser.includes('firefox')
  ) {
    return Promise.resolve();
  }
  return Promise.reject('Unsupported browser');
};

export const getBackgroundStorage: any = async (): Promise<any> => {
  await verifyBrowserStorageSupport();
  try {
    // Wait for chrome.storage to be available (important for bundle mode)
    await browser.waitUntil(
      async () => {
        const isAvailable = await browser.execute(() => {
          return typeof chrome !== 'undefined' && 
                 chrome.storage !== undefined && 
                 chrome.storage.local !== undefined;
        });
        return isAvailable;
      },
      {
        timeout: 10000,
        timeoutMsg: 'chrome.storage.local API not available after 10 seconds'
      }
    );

    return await browser.execute(`
      return (async () => {
        const response = await chrome.storage.local.get("BACKGROUND_STORAGE");
        return response.BACKGROUND_STORAGE;
      })()
      `);
  } catch (error) {
    throw new Error(`Getting browser storage failed: ${error}`);
  }
};

export const setUsePersistentUserId = async (): Promise<void> => {
  await verifyBrowserStorageSupport();

  const backgroundStorage = await getBackgroundStorage();
  backgroundStorage.usePersistentUserId = true;
  try {
    await browser.execute(`
      return (async () => { await chrome.storage.local.set({ BACKGROUND_STORAGE: ${JSON.stringify(
        backgroundStorage
      )}}) })()
    `);
  } catch (error) {
    throw new Error(`Setting browser storage failed: ${error}`);
  }
};

export const setColorScheme = async (colorScheme: string): Promise<void> => {
  await verifyBrowserStorageSupport();

  const backgroundStorage = await getBackgroundStorage();
  backgroundStorage.colorScheme = colorScheme;
  try {
    await browser.execute(`
      return (async () => { await chrome.storage.local.set({ BACKGROUND_STORAGE: ${JSON.stringify(
        backgroundStorage
      )}}) })()
    `);
  } catch (error) {
    throw new Error(`Setting browser storage failed: ${error}`);
  }
};

export const cleanBrowserStorage: any = async (): Promise<void> => {
  await verifyBrowserStorageSupport();

  try {
    await browser.execute('return (async () => { await chrome.storage.local.clear(); })()', []);
  } catch (error) {
    throw new Error(`Clearing browser storage failed: ${error}`);
  }
};

export const clearBackgroundStorageKey: any = async (): Promise<void> => {
  await verifyBrowserStorageSupport();
  try {
    await browser.execute('return (async () => { await chrome.storage.local.remove("BACKGROUND_STORAGE"); })()');
  } catch (error) {
    Logger.warn(`Clearing background storage key failed: ${error}`);
  }
};

export const shiftBackFiatPriceFetchedTimeInBrowserStorage = async (seconds: number): Promise<void> => {
  const backgroundStorage = await getBackgroundStorage();
  backgroundStorage.fiatPrices.timestamp -= seconds * 1000;
  try {
    await browser.execute(
      `await chrome.storage.local.set({ BACKGROUND_STORAGE: ${JSON.stringify(backgroundStorage)}})`,
      []
    );
  } catch (error) {
    throw new Error(`Setting browser storage failed: ${error}`);
  }
};

export const deleteFiatPriceTimestampFromBackgroundStorage = async (): Promise<void> => {
  const backgroundStorage = await getBackgroundStorage();
  delete backgroundStorage.fiatPrices.timestamp;
  try {
    await browser.execute(
      `await chrome.storage.local.set({ BACKGROUND_STORAGE: ${JSON.stringify(backgroundStorage)}})`,
      []
    );
  } catch (error) {
    throw new Error(`Setting browser storage failed: ${error}`);
  }
};
