/* eslint-disable no-undef */
/* eslint-disable unicorn/prefer-module */

import { config as baseConfig } from './wdio.conf.base';

const DIST_LOCATION =
  String(process.env.LMP_BUNDLE) === 'true' ? '../../../dist' : '../../apps/browser-extension-wallet/dist';

const chromeConfig = {
  capabilities: [
    {
      maxInstances: 1,
      browserName: 'chrome',
      browserVersion: 'stable',
      webSocketUrl: true,
      ...(String(process.env.STANDALONE_DRIVER) === 'true' && { hostname: 'localhost' }),
      ...(String(process.env.STANDALONE_DRIVER) === 'true' && { port: 4444 }),
      'goog:chromeOptions': {
        args: [
          '--no-sandbox',
          '--disable-gpu',
          '--disable-notifications',
          '--enable-automation',
          '--no-first-run',
          '--no-default-browser-check',
          `--load-extension=${import.meta.dirname}/${DIST_LOCATION}`,
          '--allow-insecure-localhost',
          '--window-size=1920,1080',
          '--allow-file-access-from-files',
          '--disable-dev-shm-usage',
          '--remote-allow-origins=*',
          '--disable-search-engine-choice-screen',
          '--disable-infobars'
        ]
      }
    }
  ],
  services: ['intercept']
};

if (String(process.env.STANDALONE_DRIVER) === 'true') {
  fetch('http://127.0.0.1:4444/wd/hub').catch(() => {
    throw new Error("chromedriver doesn't seem to be running, please start it first");
  });
}

export const config: WebdriverIO.Config = { ...baseConfig, ...chromeConfig };
