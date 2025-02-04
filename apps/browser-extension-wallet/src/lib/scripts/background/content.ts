import { runtime } from 'webextension-polyfill';
import { consumeRemoteApi, MessengerDependencies, runContentScriptMessageProxy } from '@cardano-sdk/web-extension';
import { consumeRemoteAuthenticatorApi, consumeRemoteWalletApi } from './api-consumers';
import { LACE_FEATURES_CHANNEL, laceFeaturesApiProperties } from './injectUtil';
import { logger } from '@lace/common';

// Disable logging in production for performance & security measures
if (process.env.USE_DAPP_CONNECTOR === 'true') {
  logger.info('initializing content script');

  const initializeContentScript = (walletName: string, dependencies: MessengerDependencies) => {
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

    return runContentScriptMessageProxy(apis, dependencies.logger);
  };

  initializeContentScript(process.env.WALLET_NAME, { logger, runtime });
}
