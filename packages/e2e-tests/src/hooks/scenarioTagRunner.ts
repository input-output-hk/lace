import { Before } from '@cucumber/cucumber';
import { After, AfterStep } from '@wdio/cucumber-framework';
import { browser } from '@wdio/globals';
import consoleManager from '../utils/consoleManager';

import allure from '@wdio/allure-reporter';
import testContext from '../utils/testContext';
import { PidMonitor } from '../support/PidMonitor';
const monitor = new PidMonitor(1000);

// eslint-disable-next-line no-unused-vars
Before(async () => {
  if (String(process.env.SERVICE_WORKER_LOGS) === 'true') {
    await consoleManager.startLogsCollection();
  }
  const pidMonitorInitialized = await monitor.init();
  if (!pidMonitorInitialized) return;
  monitor.start();
});

After({ tags: 'not @Pending and not @pending' }, async (scenario) => {
  monitor.stop();
  monitor.saveToFile(`./metrics/${scenario.testCaseStartedId}-chrome-usage.json`);
  // allure.addAttachment('Perf data', monitor.data, 'text/plain');
  monitor.clear();

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
