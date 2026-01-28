import { Before } from '@cucumber/cucumber';
import { After, AfterStep } from '@wdio/cucumber-framework';
import { browser } from '@wdio/globals';
import consoleManager from '../utils/consoleManager';

import allure from '@wdio/allure-reporter';
import testContext from '../utils/testContext';
import PidMonitor from '../support/PidMonitor';
import { Logger } from '../support/logger';
import networkManager from '../utils/networkManager';
import { getServiceWorkerCrashLog, checkServiceWorkerAlive, reloadExtensionFromExtensionsPage } from '../fixture/walletRepositoryInitializer';

const monitor = PidMonitor.getInstance();

// Extension ID - used for reloading extension after session restart
const CHROME_EXTENSION_ID = 'gafhhkghbfjjkeiendhlofajokpaflmk';

// eslint-disable-next-line no-unused-vars
Before(async (scenario) => {
  if (String(process.env.SERVICE_WORKER_LOGS) === 'true') {
    await consoleManager.startLogsCollection();
  }
  if (browser.isChromium) {
    const pidMonitorInitialized = await monitor.init();
    if (pidMonitorInitialized) {
      monitor.setScenarioName(scenario.pickle.name);
      monitor.start();
    } else {
      Logger.warn('PID monitor not initialized. Skipping start.');
    }
  }
});

After({ tags: 'not @Pending and not @pending' }, async (scenario) => {
  if (browser.isChromium) {
    monitor.stop();
    monitor.saveToFile(`./metrics/${scenario.testCaseStartedId}-chrome-usage.json`);
    monitor.clear();
  }
  testContext.clearContext();
  
  // Close Chrome DevTools Protocol sessions before reloading to prevent TargetCloseError
  await networkManager.closeOpenedCdpSessions();
  await consoleManager.closeOpenedCdpSessions();
  
  await browser.reloadSession();
  
  // After reloadSession(), the extension context is often broken - scripts load but don't execute.
  // This is a known Chrome issue: extensions need to be manually reloaded after browser restart.
  // See: https://courtneyzhan.medium.com/reloading-a-chrome-extension-using-selenium-webdriver-85ac0e0faa97
  if (browser.isChromium) {
    await reloadExtensionFromExtensionsPage(CHROME_EXTENSION_ID);
  }
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
    
    // Check for SW crash and capture crash log
    try {
      const swStatus = await checkServiceWorkerAlive(10000);
      if (!swStatus.alive) {
        Logger.error(`[AfterStep] SERVICE WORKER APPEARS CRASHED! Heartbeat age: ${swStatus.heartbeatAge}ms`);
        
        const crashLog = await getServiceWorkerCrashLog();
        if (crashLog) {
          const crashLogStr = JSON.stringify(crashLog, null, 2);
          Logger.error(`[AfterStep] SW Crash Log:\n${crashLogStr}`);
          allure.addAttachment('Service worker crash log', crashLogStr, 'application/json');
        }
      }
    } catch (e) {
      Logger.warn(`[AfterStep] Failed to check SW crash status: ${e}`);
    }
    
    await consoleManager.clearLogs();
    await consoleManager.closeOpenedCdpSessions();
  }
});
