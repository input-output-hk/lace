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
  
  const startTime = Date.now();
  const currentUrl = await browser.getUrl();
  const windowTitle = await browser.getTitle();
  
  Logger.log(`[getBackgroundStorage] START - URL: ${currentUrl}, Title: ${windowTitle}`);
  
  let attempts = 0;
  let lastStatus: any = null;
  
  try {
    // Wait for chrome.storage to be available (important for bundle mode)
    await browser.waitUntil(
      async () => {
        attempts++;
        const result = await browser.execute(() => {
          return {
            hasChrome: typeof chrome !== 'undefined',
            hasStorage: typeof chrome !== 'undefined' && chrome.storage !== undefined,
            hasLocal: typeof chrome !== 'undefined' && chrome.storage !== undefined && chrome.storage.local !== undefined,
            documentReady: document.readyState,
            isExtensionPage: window.location.protocol === 'chrome-extension:'
          };
        });
        
        lastStatus = result;
        const isAvailable = result.hasChrome && result.hasStorage && result.hasLocal;
        
        if (attempts === 1 || attempts % 5 === 0 || isAvailable) {
          Logger.log(`[getBackgroundStorage] Attempt ${attempts} (${Date.now() - startTime}ms): ${JSON.stringify(result)}`);
        }
        
        return isAvailable;
      },
      {
        timeout: 15000,
        interval: 500,
        timeoutMsg: `chrome.storage.local API not available after 15 seconds. Last status: ${JSON.stringify(lastStatus)}`
      }
    );

    Logger.log(`[getBackgroundStorage] chrome.storage.local available after ${Date.now() - startTime}ms`);

    return await browser.execute(`
      return (async () => {
        const response = await chrome.storage.local.get("BACKGROUND_STORAGE");
        return response.BACKGROUND_STORAGE;
      })()
      `);
  } catch (error) {
    Logger.error(`[getBackgroundStorage] FAILED after ${Date.now() - startTime}ms and ${attempts} attempts`);
    Logger.error(`[getBackgroundStorage] Last status: ${JSON.stringify(lastStatus)}`);
    Logger.error(`[getBackgroundStorage] URL: ${currentUrl}, Title: ${windowTitle}`);
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
