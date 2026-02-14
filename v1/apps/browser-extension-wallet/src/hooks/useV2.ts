import { logger, useObservable } from '@lace/common';
import { Wallet } from '@lace/cardano';
import { consumeRemoteApi } from '@cardano-sdk/web-extension';
import { APP_MODE, bundleAppApiProps } from '@utils/lmp';
import { runtime } from 'webextension-polyfill';
import { v2ApiBaseChannel, v2ModeStorage } from '@utils/v2';

const v2Api = consumeRemoteApi(
  {
    baseChannel: v2ApiBaseChannel,
    properties: bundleAppApiProps
  },
  { logger, runtime }
);

const navigateToV2 = (): void => {
  if (window.location.pathname.startsWith('/popup.html')) {
    chrome.tabs.create({ url: '/tab.html' });
  } else {
    window.location.href = '/tab.html';
  }
};

const switchToV2 = async (): Promise<void> => {
  await v2ModeStorage.set(APP_MODE.V2);
  navigateToV2();
};

type UseV2ReturnType = {
  midnightWallets: Wallet.LmpBundleWallet[] | undefined;
  switchToV2: () => Promise<void>;
};

export const useV2 = (): UseV2ReturnType => {
  const midnightWallets = useObservable<Wallet.LmpBundleWallet[] | undefined>(v2Api.wallets$);
  return { midnightWallets, switchToV2 };
};
