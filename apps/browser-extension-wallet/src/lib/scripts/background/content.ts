import { runtime } from 'webextension-polyfill';
import { cip30 } from '@cardano-sdk/web-extension';
// Disable logging in production for performance & security measures
if (process.env.USE_DAPP_CONNECTOR === 'true') {
  console.log('initializing content script');
  cip30.initializeContentScript(
    { injectedScriptSrc: runtime.getURL('./js/inject.js'), walletName: process.env.WALLET_NAME },
    { logger: console, runtime }
  );
}
