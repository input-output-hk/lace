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
  ]
};

if (!process.env.CI) {
  edgeConfig.services = [
    [
      'selenium-standalone',
      {
        installArgs: { drivers },
        args: { drivers }
      }
    ]
  ];
}

export const config: WebdriverIO.Config = { ...baseConfig, ...edgeConfig };
