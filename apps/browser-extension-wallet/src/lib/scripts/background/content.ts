import { runtime } from 'webextension-polyfill';
import {
  cip30,
  consumeRemoteApi,
  MessengerDependencies,
  runContentScriptMessageProxy
} from '@cardano-sdk/web-extension';
import { consumeRemoteAuthenticatorApi, consumeRemoteWalletApi } from './api-consumers';
import { laceFeaturesApiProperties, LACE_FEATURES_CHANNEL } from './injectUtil';

// Disable logging in production for performance & security measures
if (process.env.USE_DAPP_CONNECTOR === 'true') {
  console.info('initializing content script');

  const initializeContentScript = (
    { injectedScriptSrc, walletName }: cip30.InitializeContentScriptProps,
    dependencies: MessengerDependencies
  ) => {
    const apis = [
      consumeRemoteAuthenticatorApi({ walletName }, dependencies),
      consumeRemoteWalletApi({ walletName }, dependencies),
      consumeRemoteApi(
        {
          baseChannel: LACE_FEATURES_CHANNEL,
          properties: laceFeaturesApiProperties
        },
        dependencies
      )
    ];
    const proxy = runContentScriptMessageProxy(apis, dependencies.logger);

    const script = document.createElement('script');
    script.async = false;
    script.src = injectedScriptSrc;
    script.addEventListener('load', () => script.remove());
    (document.head || document.documentElement).append(script);

    return proxy;
  };

  initializeContentScript(
    { injectedScriptSrc: runtime.getURL('./js/inject.js'), walletName: process.env.WALLET_NAME },
    { logger: console, runtime }
  );
}
