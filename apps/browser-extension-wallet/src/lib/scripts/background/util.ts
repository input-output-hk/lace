/* eslint-disable no-magic-numbers */
import { POPUP_WINDOW } from '@src/utils/constants';
import { getRandomIcon } from '@lace/common';
import { runtime, Tabs, tabs, Windows, windows, Runtime } from 'webextension-polyfill';
import { Wallet } from '@lace/cardano';
import { BackgroundStorage } from '../types';
import uniqueId from 'lodash/uniqueId';
import { firstValueFrom } from 'rxjs';
import { AnyWallet, WalletManagerApi, WalletRepositoryApi, WalletType } from '@cardano-sdk/web-extension';
import { getBackgroundStorage } from './storage';

const { blake2b } = Wallet.Crypto;

type WindowPosition = {
  top: number;
  left: number;
};

type WindowSize = {
  height: number;
  width: number;
};

type WindowSizeAndPositionProps = WindowPosition & WindowSize;

type WalletManagementServices = {
  walletRepository: WalletRepositoryApi<Wallet.WalletMetadata, Wallet.AccountMetadata>;
  walletManager: WalletManagerApi;
};

export const getADAPriceFromBackgroundStorage = async (): Promise<BackgroundStorage['fiatPrices']> => {
  const backgroundStorage = await getBackgroundStorage();
  return backgroundStorage?.fiatPrices;
};

/**
 * getDappInfoFromLastActiveTab
 * @returns {Promise<Wallet.DappInfo>}
 */
export const getDappInfoFromLastActiveTab: (sender: Runtime.MessageSender) => Promise<Wallet.DappInfo> = async (
  sender
) => {
  const lastActiveTab = sender.tab;
  if (!lastActiveTab) throw new Error('could not find DApp');
  return {
    logo: lastActiveTab.favIconUrl || getRandomIcon({ id: uniqueId(), size: 40 }),
    name: lastActiveTab.title || lastActiveTab.url.split('//')[1].trim(),
    url: lastActiveTab.url.replace(/\/$/, '')
  };
};

const calculatePopupWindowPositionAndSize = (
  window: Windows.Window,
  popup: WindowSize
): WindowSizeAndPositionProps => ({
  top: Math.floor(window.top + (window.height - POPUP_WINDOW.height) / 2),
  left: Math.floor(window.left + (window.width - POPUP_WINDOW.width) / 2),
  ...popup
});

const createTab = async (url: string, active = false) =>
  tabs.create({
    url: runtime.getURL(url),
    active,
    pinned: true
  });

const createWindow = (
  tabId: number,
  windowSize: WindowSizeAndPositionProps,
  type: Windows.CreateType,
  focused = false
) =>
  windows.create({
    tabId,
    type,
    focused,
    ...windowSize
  });

/**
 * launchCip30Popup
 * @param url - Originating url of current dapp
 * @param windowType 'normal' for hardware wallet interactions, 'popup' for everything else
 * @returns tab - Tab of currently launched dApp connector
 */
export const launchCip30Popup = async (url: string, windowType: Windows.CreateType): Promise<Tabs.Tab> => {
  const currentWindow = await windows.getCurrent();
  const tab = await createTab(`../dappConnector.html${url}`, false);
  const newWindow = await createWindow(
    tab.id,
    calculatePopupWindowPositionAndSize(currentWindow, POPUP_WINDOW),
    windowType,
    true
  );
  newWindow.alwaysOnTop = true;
  return tab;
};

const waitForTabLoad = (tab: Tabs.Tab) =>
  // eslint-disable-next-line promise/avoid-new
  new Promise<void>((resolve) => {
    const listener = (tabId: number, changeInfo: Tabs.OnUpdatedChangeInfoType) => {
      // make sure the status is 'complete' and it's the right tab
      if (tabId === tab.id && changeInfo.status === 'complete') {
        tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    tabs.onUpdated.addListener(listener);
  });

export const getActiveWallet = async ({
  walletManager,
  walletRepository
}: WalletManagementServices): Promise<AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata> | undefined> => {
  const activeWallet = await firstValueFrom(walletManager.activeWalletId$);
  if (!activeWallet) return;
  const wallets = await firstValueFrom(walletRepository.wallets$);
  // eslint-disable-next-line consistent-return
  return wallets.find(({ walletId }) => walletId === activeWallet.walletId);
};

export const ensureUiIsOpenAndLoaded = async (
  services: WalletManagementServices,
  url?: string,
  checkKeyAgent = true
): Promise<Tabs.Tab> => {
  const keyAgentTypeIsHardwareWallet = checkKeyAgent
    ? await (async () => {
        const activeWallet = await getActiveWallet(services);
        return activeWallet?.type === WalletType.Ledger || activeWallet?.type === WalletType.Trezor;
      })()
    : undefined;

  const windowType: Windows.CreateType = keyAgentTypeIsHardwareWallet ? 'normal' : 'popup';
  if (keyAgentTypeIsHardwareWallet) {
    const openTabs = await tabs.query({ title: 'Lace' });
    // Close all previously opened lace windows
    for (const tab of openTabs) {
      tabs.remove(tab.id);
    }
  }

  const tab = await launchCip30Popup(url, windowType);
  if (tab.status !== 'complete') {
    await waitForTabLoad(tab);
  }
  return tab;
};

export const getWalletName = (): string => {
  if (!process.env.WALLET_NAME) {
    throw new Error('No wallet name declared in .env');
  }
  return `${process.env.WALLET_NAME}`;
};

export const hashExtendedAccountPublicKey = (extendedAccountPublicKey: string): string => {
  const input = Buffer.from(extendedAccountPublicKey);
  return blake2b(blake2b.BYTES_MIN).update(input).digest('hex');
};
