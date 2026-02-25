import { dummyLogger } from 'ts-log';
import { runtime } from 'webextension-polyfill';
import { MessengerDependencies, runContentScriptMessageProxy } from '@cardano-sdk/web-extension';
import { consumeRemoteAuthenticatorApi, consumeRemoteWalletApi } from './api-consumers';

const logger = process.env.NODE_ENV === 'development' ? console : dummyLogger;
// Disable logging in production for performance & security measures
if (process.env.USE_DAPP_CONNECTOR === 'true') {
  logger.debug('initializing content script');

  const initializeContentScript = (walletName: string, dependencies: MessengerDependencies) => {
    const apis = [
      consumeRemoteAuthenticatorApi({ walletName }, dependencies),
      consumeRemoteWalletApi({ walletName }, dependencies)
    ];

    return runContentScriptMessageProxy(apis, dependencies.logger);
  };

  initializeContentScript(process.env.WALLET_NAME, { logger, runtime });
}
