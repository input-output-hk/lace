/* eslint-disable no-undef */
/* eslint-disable unicorn/prefer-module */

import { config as baseConfig } from './wdio.conf.base';

if (!process.env.FIREFOX_BINARY) {
  throw new Error('Environment variable FIREFOX_BINARY is not set. Please set it before running tests.');
}

const firefoxConfig = {
  capabilities: [
    {
      maxInstances: 1,
      browserName: 'firefox',
      ...(String(process.env.STANDALONE_DRIVER) === 'true' && { hostname: 'localhost' }),
      ...(String(process.env.STANDALONE_DRIVER) === 'true' && { port: 4444 }),
      'moz:debuggerAddress': true,
      'moz:firefoxOptions': {
        binary: process.env.FIREFOX_BINARY,
        args: []
      }
    }
  ],
  services: [
    [
      'firefox-profile',
      {
        extensions: [`${import.meta.dirname}/../../apps/browser-extension-wallet/dist`],
        'xpinstall.signatures.required': false
      }
    ]
  ]
};

if (String(process.env.STANDALONE_DRIVER) === 'true') {
  fetch('http://127.0.0.1:4444/wd/hub').catch(() => {
    throw new Error("geckodriver doesn't seem to be running, please start it first");
  });
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const config: WebdriverIO.Config = { ...baseConfig, ...firefoxConfig };
