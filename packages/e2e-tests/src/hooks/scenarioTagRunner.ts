import { Before } from '@cucumber/cucumber';
import { After, AfterStep } from '@wdio/cucumber-framework';
import localStorageManager from '../utils/localStorageManager';
import testContext from '../utils/testContext';
import { clearBackgroundStorageKey } from '../utils/browserStorage';
import { closeAllTabsExceptOriginalOne } from '../utils/window';
import networkManager from '../utils/networkManager';
import { browser } from '@wdio/globals';
import consoleManager from '../utils/consoleManager';

import { clearWalletRepository } from '../fixture/walletRepositoryInitializer';
import allure from '@wdio/allure-reporter';
import extensionUtils from '../utils/utils';

// eslint-disable-next-line no-unused-vars
Before(async () => {
  if (String(process.env.SERVICE_WORKER_LOGS) === 'true') {
    await consoleManager.startLogsCollection();
  }
});

After({ tags: 'not @Pending and not @pending' }, async () => {
  await clearWalletRepository();
  await networkManager.closeOpenedCdpSessions();
  await consoleManager.closeOpenedCdpSessions();
  if ((await extensionUtils.getBrowser()) !== 'firefox') {
    await browser.disableInterceptor();
  }
  testContext.clearContext();
  await clearBackgroundStorageKey(); // FIXME: does not work for onboarding scenarios - error is thrown
  await localStorageManager.cleanLocalStorage();
  await closeAllTabsExceptOriginalOne();
  await browser.pause(500);
});

AfterStep(async (scenario) => {
  if (scenario.result.status === 'FAILED') {
    await browser.takeScreenshot();

    if (String(process.env.SERVICE_WORKER_LOGS) === 'true') {
      const logs = await consoleManager.getLogsAsString();
      if (logs !== undefined) {
        allure.addAttachment('Service worker logs', logs, 'text/plain');
      }
    }
    await consoleManager.clearLogs();
    await consoleManager.closeOpenedCdpSessions();
  }
});
