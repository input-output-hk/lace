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

// Default extension URL for Chrome
const CHROME_EXTENSION_URL = 'chrome-extension://gafhhkghbfjjkeiendhlofajokpaflmk/app.html';

export const getBackgroundStorage: any = async (): Promise<any> => {
  await verifyBrowserStorageSupport();
  
  const startTime = Date.now();
  let currentUrl = await browser.getUrl();
  let windowTitle = await browser.getTitle();
  
  Logger.log(`[getBackgroundStorage] START - URL: ${currentUrl}, Title: ${windowTitle}`);
  
  // If not on extension page, try to switch to Lace window or navigate to extension
  if (!currentUrl.startsWith('chrome-extension://') && !currentUrl.startsWith('moz-extension://')) {
    Logger.warn(`[getBackgroundStorage] Not on extension page, attempting to switch to Lace window...`);
    
    let switchedSuccessfully = false;
    try {
      await browser.switchWindow(/^Lace$/);
      currentUrl = await browser.getUrl();
      windowTitle = await browser.getTitle();
      Logger.log(`[getBackgroundStorage] Switched to Lace - URL: ${currentUrl}, Title: ${windowTitle}`);
      switchedSuccessfully = currentUrl.startsWith('chrome-extension://') || currentUrl.startsWith('moz-extension://');
    } catch (switchError) {
      Logger.warn(`[getBackgroundStorage] Failed to switch to Lace window: ${switchError}`);
    }
    
    // If switch failed or didn't land on extension page, navigate directly to extension URL
    if (!switchedSuccessfully) {
      Logger.log(`[getBackgroundStorage] No Lace window found, navigating directly to extension URL...`);
      try {
        await browser.url(CHROME_EXTENSION_URL);
        // Wait for navigation to complete
        await browser.waitUntil(
          async () => {
            const url = await browser.getUrl();
            return url.startsWith('chrome-extension://') || url.startsWith('moz-extension://');
          },
          {
            timeout: 15000,
            interval: 500,
            timeoutMsg: 'Failed to navigate to extension URL'
          }
        );
        currentUrl = await browser.getUrl();
        windowTitle = await browser.getTitle();
        Logger.log(`[getBackgroundStorage] Navigated to extension - URL: ${currentUrl}, Title: ${windowTitle}`);
      } catch (navError) {
        Logger.error(`[getBackgroundStorage] Failed to navigate to extension URL: ${navError}`);
      }
    }
  }
  
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
            isExtensionPage: window.location.protocol === 'chrome-extension:' || window.location.protocol === 'moz-extension:',
            currentUrl: window.location.href
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
