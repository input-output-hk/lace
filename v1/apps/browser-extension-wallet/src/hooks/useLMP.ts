import { consumeRemoteApi } from '@cardano-sdk/web-extension';
import { logger, useObservable } from '@lace/common';
import { Wallet } from '@lace/cardano';
import {
  APP_MODE,
  bundleAppApiProps,
  lmpApiBaseChannel,
  lmpModeStorage,
  onboardingParamsStorage
} from '@src/utils/lmp';
import { runtime } from 'webextension-polyfill';

const lmpApi = consumeRemoteApi(
  {
    baseChannel: lmpApiBaseChannel,
    properties: bundleAppApiProps
  },
  { logger, runtime }
);

const navigateToLMP = (): void => {
  if (window.location.pathname.startsWith('/popup.html')) {
    chrome.tabs.create({ url: '/tab.html' });
  } else {
    window.location.href = '/tab.html';
  }
};

const switchToLMP = async (): Promise<void> => {
  await lmpModeStorage.set(APP_MODE.LMP);
  navigateToLMP();
};

const startMidnightCreate = (): void =>
  void (async () => {
    await onboardingParamsStorage.set({ mode: 'create' });
    await switchToLMP();
  })();

const startMidnightRestore = (): void =>
  void (async () => {
    await onboardingParamsStorage.set({ mode: 'restore' });
    await switchToLMP();
  })();

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const useLMP = () => {
  const midnightWallets = useObservable<Wallet.LmpBundleWallet[] | undefined>(lmpApi.wallets$);
  return { midnightWallets, switchToLMP, startMidnightCreate, startMidnightRestore };
};
