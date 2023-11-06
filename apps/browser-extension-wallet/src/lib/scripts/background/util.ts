/* eslint-disable no-magic-numbers */
import { POPUP_WINDOW } from '@src/utils/constants';
import { getRandomIcon } from '@lace/common';
import { runtime, Tabs, tabs, Windows, windows, storage as webStorage } from 'webextension-polyfill';
import { Wallet } from '@lace/cardano';
import { BackgroundStorage, BackgroundStorageKeys, MigrationState } from '../types';
import uniqueId from 'lodash/uniqueId';

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

export const INITIAL_STORAGE = { MIGRATION_STATE: { state: 'not-loaded' } as MigrationState };

/**
 * Gets the background storage content
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getBackgroundStorage = async (): Promise<BackgroundStorage> =>
  (await webStorage.local.get('BACKGROUND_STORAGE'))?.BACKGROUND_STORAGE ?? {};

export const getADAPriceFromBackgroundStorage = async (): Promise<BackgroundStorage['fiatPrices']> => {
  const backgroundStorage = await getBackgroundStorage();
  return backgroundStorage?.fiatPrices;
};

/**
 * Deletes the specified `keys` from the background storage.
 *
 * If no `options` are passed then **ALL** of it is cleared.
 *
 * @param options Optional. List of keys to either delete or remove from storage
 */
type ClearBackgroundStorageOptions =
  | {
      keys: BackgroundStorageKeys[];
      except?: never;
    }
  | {
      keys?: never;
      except: BackgroundStorageKeys[];
    };
export const clearBackgroundStorage = async (options?: ClearBackgroundStorageOptions): Promise<void> => {
  if (!options) {
    await webStorage.local.remove('BACKGROUND_STORAGE');
    return;
  }
  const backgroundStorage = await getBackgroundStorage();
  for (const key in backgroundStorage) {
    if (options.keys && options.keys.includes(key as BackgroundStorageKeys)) {
      delete backgroundStorage[key as BackgroundStorageKeys];
    }
    if (options.except && !options.except.includes(key as BackgroundStorageKeys)) {
      delete backgroundStorage[key as BackgroundStorageKeys];
    }
  }
  await webStorage.local.set({ BACKGROUND_STORAGE: backgroundStorage ?? {} });
};

/**
 * Adds content to the background storage. Does not replace it.
 */
export const setBackgroundStorage = async (data: BackgroundStorage): Promise<void> => {
  const backgroundStorage = await getBackgroundStorage();

  await webStorage.local.set({ BACKGROUND_STORAGE: { ...backgroundStorage, ...data } });
};

/**
 * Initialize MIGRATION_STATE
 */
export const initMigrationState = async (): Promise<void> => {
  await webStorage.local.set(INITIAL_STORAGE);
};

export const getLastActiveTab: () => Promise<Tabs.Tab> = async () =>
  await (
    await tabs.query({ currentWindow: true, active: true })
  )[0];

/**
 * getDappInfoFromLastActiveTab
 * @returns {Promise<Wallet.DappInfo>}
 */
export const getDappInfoFromLastActiveTab: () => Promise<Wallet.DappInfo> = async () => {
  const lastActiveTab = await getLastActiveTab();
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

const keyAgentIsHardwareWallet = (keyAgentsByChain?: Wallet.KeyAgentsByChain): boolean => {
  if (!keyAgentsByChain) return false;
  return Object.values(keyAgentsByChain).some(
    ({ keyAgentData }) => keyAgentData.__typename !== Wallet.KeyManagement.KeyAgentType.InMemory
  );
};

export const ensureUiIsOpenAndLoaded = async (url?: string, checkKeyAgent = true): Promise<Tabs.Tab> => {
  const bgStorage = await getBackgroundStorage();

  const keyAgentTypeIsHardwareWallet = checkKeyAgent
    ? keyAgentIsHardwareWallet(bgStorage?.keyAgentsByChain)
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
