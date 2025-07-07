import { dummyLogger } from 'ts-log';
import { runtime } from 'webextension-polyfill';
import { consumeRemoteApi, MessengerDependencies, runContentScriptMessageProxy } from '@cardano-sdk/web-extension';
import { consumeRemoteAuthenticatorApi, consumeRemoteWalletApi } from './api-consumers';
import { LACE_FEATURES_CHANNEL, laceFeaturesApiProperties } from './injectUtil';
import { bringInitContentScript } from '@bringweb3/chrome-extension-kit';
// import { ensureUiIsOpenAndLoaded } from './util';
// import { ensureUiIsOpenAndLoaded } from './util';

const logger = process.env.NODE_ENV === 'development' ? console : dummyLogger;
// const WALLET_ADDR_WAIT_CALLBACK = 200;

/* const doBringThing = (walletApi: WalletApi) => {
  /* bringInitContentScript({
    getWalletAddress: async () =>
      await new Promise((resolve) =>
        setTimeout(() => resolve(walletApi.getUsedAddresses().then((addrs) => addrs[0])), WALLET_ADDR_WAIT_CALLBACK)
      ), // Async function that returns the current user's wallet address
    promptLogin: () => {
      console.log('login prompted');
      return ensureUiIsOpenAndLoaded().then(() => Promise.resolve());
    }, // Function that prompts a UI element asking the user to login
    // walletAddressListeners: ['customEvent:addressChanged'], // An optional list of custom events that dispatched when the user's wallet address had changed, don't add it if you are using walletAddressUpdateCallback
    walletAddressUpdateCallback: (callback) => {
      console.log('callback', callback);
      console.log('addressupdate callback');
    }, // an optional function that runs when the user's wallet address had changed and execute the callback, don't add it if you are using walletAddressUpdateCallback
    switchWallet: true, // Add switch wallet button, this requires also a UI for changing wallet address.
    theme: 'light', // 'light' | 'dark',
    text: 'lower' // 'lower' | 'upper'
  });
};*/

// Disable logging in production for performance & security measures
if (process.env.USE_DAPP_CONNECTOR === 'true') {
  logger.debug('initializing content script');

  const initializeContentScript = (walletName: string, dependencies: MessengerDependencies) => {
    const walletApi = consumeRemoteWalletApi({ walletName }, dependencies);
    const apis = [
      consumeRemoteAuthenticatorApi({ walletName }, dependencies),
      walletApi,
      consumeRemoteApi(
        {
          baseChannel: LACE_FEATURES_CHANNEL,
          properties: laceFeaturesApiProperties
        },
        dependencies
      )
    ];

    bringInitContentScript({
      getWalletAddress: async () => {
        console.log('trying to get wallet addr');
        await consumeRemoteAuthenticatorApi({ walletName }, dependencies).requestAccess();
        const [addr] = await walletApi.getUsedAddresses();
        console.log('got one', addr);
        return addr;
      }, // Async function that returns the current user's wallet address
      promptLogin: async () => {
        console.log('login prompted');
        // ensureUiIsOpenAndLoaded();
        const isLoggedIn = await consumeRemoteAuthenticatorApi({ walletName }, dependencies).requestAccess();
        if (isLoggedIn) {
          return Promise.resolve();
        }
        // await launchCip30Popup('#/bring3/login');
        return Promise.reject('not logged in');
      }, // Function that prompts a UI element asking the user to login
      // walletAddressListeners: ['customEvent:addressChanged'], // An optional list of custom events that dispatched when the user's wallet address had changed, don't add it if you are using walletAddressUpdateCallback
      walletAddressUpdateCallback: async () => {
        await consumeRemoteAuthenticatorApi({ walletName }, dependencies).requestAccess();
        const [addr] = await walletApi.getUsedAddresses();
        console.log('got one', addr);
        return addr;
      }, // an optional function that runs when the user's wallet address had changed and execute the callback, don't add it if you are using walletAddressUpdateCallback
      switchWallet: true, // Add switch wallet button, this requires also a UI for changing wallet address.
      theme: 'light', // 'light' | 'dark',
      text: 'lower' // 'lower' | 'upper'
    });

    return runContentScriptMessageProxy(apis, dependencies.logger);
  };

  initializeContentScript(process.env.WALLET_NAME, { logger, runtime });
}
