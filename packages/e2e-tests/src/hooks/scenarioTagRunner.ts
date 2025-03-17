import { Before } from '@cucumber/cucumber';
import { After, AfterStep } from '@wdio/cucumber-framework';
import { browser } from '@wdio/globals';
import consoleManager from '../utils/consoleManager';

import allure from '@wdio/allure-reporter';
import testContext from '../utils/testContext';

// eslint-disable-next-line no-unused-vars
Before(async () => {
  if (String(process.env.SERVICE_WORKER_LOGS) === 'true') {
    await consoleManager.startLogsCollection();
  }
});

After({ tags: 'not @Pending and not @pending' }, async () => {
  testContext.clearContext();
  await browser.reloadSession();
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
