import { runtime } from 'webextension-polyfill';
import { cip30 } from '@cardano-sdk/web-extension';
import { isFeatureEnabled } from '@src/utils/feature-flags';

// Disable logging in production for performance & security measures
if (isFeatureEnabled('DAPP_CONNECTOR')) {
  console.info('initializing content script');
  cip30.initializeContentScript(
    { injectedScriptSrc: runtime.getURL('./js/inject.js'), walletName: process.env.WALLET_NAME },
    { logger: console, runtime }
  );
}
