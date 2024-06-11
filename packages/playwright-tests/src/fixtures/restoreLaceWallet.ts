import { BrowserContext, chromium, Page, test as base } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

import { OnboardingPage } from '../pages/onboardingPage';
import { TestWallet } from '../utils/wallets';

type RestoreLaceWallet = {
  context: BrowserContext;
  extensionId: string;
  useRestoreWallet: (testWallet: TestWallet) => Promise<Page>;
};

export const test = base.extend<RestoreLaceWallet>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const pathToExtension = path.join(__dirname, '../../../../apps/browser-extension-wallet/dist');
    const isHeadless = process.env.PLAYWRIGHT_HEADLESS === 'true';
    const context = await chromium.launchPersistentContext('', {
      headless: isHeadless,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        `${isHeadless ? '--headless=new' : ''}`
      ]
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    await context.pages()[0].close();
    let [background] = context.serviceWorkers();
    if (!background) background = await context.waitForEvent('serviceworker');

    // eslint-disable-next-line no-magic-numbers
    const extensionId = background.url().split('/')[2];
    await use(extensionId);
  },
  useRestoreWallet: async ({ page, extensionId }, use) => {
    const restoreWallet = async (testWallet: TestWallet) => {
      await page.goto(`chrome-extension://${extensionId}/app.html#/setup`);
      await new OnboardingPage(page).restoreWallet(testWallet);
      // await new BaseModal(page).cancelButton.click();
      await page.goto(`chrome-extension://${extensionId}/app.html#/settings`);
      // await new SettingsPage(page).switchNetwork(testWallet.network);
      return page;
    };
    await use(restoreWallet);
  }
});

export const expect = test.expect;
