/* eslint-disable no-undef */
/* eslint-disable unicorn/prefer-module */

import { config as baseConfig } from './wdio.conf.base';

const drivers = {
  // used only for local runs!
  chrome: { version: 'latest' }
};

const braveConfig: WebdriverIO.Config = {
  capabilities: [
    {
      maxInstances: 1,
      browserName: 'chrome',
      'goog:chromeOptions': {
        binary: process.env.BRAVE_LOCATION,
        args: [
          '--no-sandbox',
          '--disable-gpu',
          '--disable-notifications',
          '--enable-automation',
          '--no-first-run',
          '--no-default-browser-check',
          `--load-extension=${__dirname}/../../apps/browser-extension-wallet/dist`,
          '--disable-web-security',
          '--allow-insecure-localhost',
          '--window-size=1920,1080',
          '--allow-file-access-from-files',
          '--disable-dev-shm-usage',
          '--remote-allow-origins=*'
        ]
      },
      'wdio:devtoolsOptions': {
        headless: false,
        ignoreDefaultArgs: true
      }
    }
  ],
  services: ['devtools', 'intercept']
};

if (!process.env.CI) {
  braveConfig.services = [
    [
      'selenium-standalone',
      {
        installArgs: { drivers },
        args: { drivers }
      }
    ],
    'devtools',
    'intercept'
  ];
}

export const config: WebdriverIO.Config = { ...baseConfig, ...braveConfig };
