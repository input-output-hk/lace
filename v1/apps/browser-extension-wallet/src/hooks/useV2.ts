import { logger, useObservable } from '@lace/common';
import { Wallet } from '@lace/cardano';
import { consumeRemoteApi, RemoteApiProperties, RemoteApiPropertyType } from '@cardano-sdk/web-extension';
import { APP_MODE, BundleAppApi } from '@utils/lmp';
import { runtime } from 'webextension-polyfill';
import { v2ApiBaseChannel, v2ModeStorage } from '@utils/v2';

type V2BundleAppApi = Pick<BundleAppApi, 'wallets$' | 'activate'>;

const v2BundleAppApiProps: RemoteApiProperties<V2BundleAppApi> = {
  wallets$: RemoteApiPropertyType.HotObservable,
  activate: RemoteApiPropertyType.MethodReturningPromise
};

const v2Api: V2BundleAppApi = consumeRemoteApi(
  {
    baseChannel: v2ApiBaseChannel,
    properties: v2BundleAppApiProps
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
