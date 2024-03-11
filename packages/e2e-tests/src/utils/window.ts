import { browser } from '@wdio/globals';

export const switchToLastWindow = async (): Promise<void> => {
  const windowHandles = await browser.getWindowHandles();
  await browser.switchToWindow(windowHandles[windowHandles.length - 1]);
};

export const getNumberOfOpenedTabs = async (): Promise<number> => (await browser.getWindowHandles()).length;

const closeAllTabsExceptExpectedOne = async (handleForTabToBeLeft: string): Promise<void> => {
  const handles: string[] = await browser.getWindowHandles();
  for (const handle of handles) {
    if (handle !== handleForTabToBeLeft) {
      await browser.switchToWindow(handle);
      await browser.closeWindow();
    }
    await browser.switchToWindow(handleForTabToBeLeft);
  }
};

export const closeAllTabsExceptOriginalOne = async (): Promise<void> => {
  const originalTab = (await browser.getWindowHandles())[0];
  await closeAllTabsExceptExpectedOne(originalTab);
};

export const closeAllTabsExceptActiveOne = async (): Promise<void> => {
  await browser.pause(1000);
  const activeTab = await browser.getWindowHandle();
  await closeAllTabsExceptExpectedOne(activeTab);
};

export const waitUntilExpectedNumberOfHandles = async (expectedNumberOfHandles: number): Promise<void> => {
  await browser.waitUntil(async () => (await browser.getWindowHandles()).length === expectedNumberOfHandles, {
    timeout: 6000,
    timeoutMsg: `failed while waiting for ${expectedNumberOfHandles} window handles. Actual number of handles ${
      (
        await browser.getWindowHandles()
      ).length
    }`
  });
};

export const switchToWindowWithLace = async (delay = 1000): Promise<void> => {
  await browser.pause(delay);
  await browser.switchWindow(/^Lace$/);
};

export const switchToWindowWithTitle = async (url: string): Promise<boolean> => {
  try {
    await browser.switchWindow(url);
    return true;
  } catch {
    return false;
  }
};

export const switchToWindowWithRetry = async (url: string): Promise<void> => {
  await browser.waitUntil(async () => await switchToWindowWithTitle(url), {
    timeout: 6000,
    interval: 1000,
    timeoutMsg: `failed while switching to tab with title: ${url}`
  });
};
