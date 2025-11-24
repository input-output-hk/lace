import { consumeRemoteApi } from '@cardano-sdk/web-extension';
import { logger, useObservable } from '@lace/common';
import { APP_MODE, bundleAppApiProps, lmpApiBaseChannel, LmpBundleWallet, lmpModeStorage } from '@src/utils/lmp';
import { runtime } from 'webextension-polyfill';

const lmpApi = consumeRemoteApi(
  {
    baseChannel: lmpApiBaseChannel,
    properties: bundleAppApiProps
  },
  { logger, runtime }
);

const switchToLMP = (): void =>
  void (async () => {
    await lmpModeStorage.set(APP_MODE.LMP);
    if (window.location.pathname.startsWith('/popup.html')) {
      chrome.tabs.create({ url: '/tab.html' });
    } else {
      window.location.href = '/tab.html';
    }
  })();

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const useLMP = () => {
  const midnightWallets = useObservable<LmpBundleWallet[] | undefined>(lmpApi.wallets$);
  return { midnightWallets, switchToLMP };
};
