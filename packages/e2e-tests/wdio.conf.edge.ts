/* eslint-disable no-undef */

import { config as baseConfig } from './wdio.conf.base';

const drivers = {
  // used only for local runs!
  chromiumedge: { version: '106.0.1370.52' }
};

const edgeConfig: WebdriverIO.Config = {
  capabilities: [
    {
      maxInstances: 1,
      browserName: 'MicrosoftEdge',
      'ms:edgeOptions': {
        args: [
          '--disable-gpu',
          '--no-sandbox',
          '--disable-notifications',
          '--enable-automation',
          '--no-first-run',
          '--no-default-browser-check',
          `--load-extension=${__dirname}/../../apps/browser-extension-wallet/dist`,
          '--disable-web-security',
          '--allow-insecure-localhost',
          '--window-size=1920,1080',
          '--allow-file-access-from-files',
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
  edgeConfig.services = [
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
} else {
  fetch('http://127.0.0.1:4444/wd/hub').catch(() => {
    throw new Error("chromedriver doesn't seem to be running, please start it first or use CI=false");
  });
}

export const config: WebdriverIO.Config = { ...baseConfig, ...edgeConfig };
