import { Before } from '@cucumber/cucumber';
import { After, AfterStep } from '@wdio/cucumber-framework';
import localStorageManager from '../utils/localStorageManager';
import testContext from '../utils/testContext';
import { clearBackgroundStorageKey } from '../utils/browserStorage';
import { closeAllTabsExceptOriginalOne } from '../utils/window';
import networkManager from '../utils/networkManager';

// eslint-disable-next-line no-unused-vars
Before(async () => {
  // use Before hooks in feature steps file, see AddressBook.ts as an example
});

After(async () => {
  await networkManager.closeOpenedCdpSessions();
  testContext.clearContext();
  await clearBackgroundStorageKey(); // FIXME: does not work for onboarding scenarios - error is thrown
  await localStorageManager.cleanLocalStorage();
  await closeAllTabsExceptOriginalOne();
});

AfterStep(async (scenario) => {
  if (scenario.result.status === 'FAILED') await browser.takeScreenshot();
});
