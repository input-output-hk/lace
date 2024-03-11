import { Before } from '@cucumber/cucumber';
import { After, AfterStep } from '@wdio/cucumber-framework';
import localStorageManager from '../utils/localStorageManager';
import testContext from '../utils/testContext';
import { clearBackgroundStorageKey } from '../utils/browserStorage';
import { closeAllTabsExceptOriginalOne } from '../utils/window';
import networkManager from '../utils/networkManager';
import { browser } from '@wdio/globals';
import consoleManager from '../utils/consoleManager';
import { clearWalletRepository } from '../fixture/browserStorageInitializer';

// eslint-disable-next-line no-unused-vars
Before(async () => {
  // use Before hooks in feature steps file, see AddressBook.ts as an example
});

After({ tags: 'not @Pending and not @pending' }, async () => {
  await clearWalletRepository();
  await networkManager.closeOpenedCdpSessions();
  await consoleManager.closeOpenedCdpSessions();
  await browser.disableInterceptor();
  testContext.clearContext();
  await clearBackgroundStorageKey(); // FIXME: does not work for onboarding scenarios - error is thrown
  await localStorageManager.cleanLocalStorage();
  await closeAllTabsExceptOriginalOne();
});

AfterStep(async (scenario) => {
  scenario.result.status;
  // if (scenario.result.status === 'FAILED') await browser.takeScreenshot();
  await browser.takeScreenshot();
});
