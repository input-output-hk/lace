/* eslint-disable no-magic-numbers */
import { Origin } from '@cardano-sdk/dapp-connector';
import { POPUP_WINDOW } from '@src/utils/constants';
import { getRandomIcon } from '@src/utils/get-random-icon';
import { runtime, Tabs, tabs, Windows, windows, storage as webStorage } from 'webextension-polyfill';
import { Wallet } from '@lace/cardano';
import { BackgroundStorage, BackgroundStorageKeys, MigrationState } from '../types';

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
export const getBackgroundStorage = async (): Promise<BackgroundStorage> => {
  const { BACKGROUND_STORAGE } = await webStorage.local.get('BACKGROUND_STORAGE');
  return BACKGROUND_STORAGE;
};

export const getADAPriceFromBackgroundStorage = async (): Promise<BackgroundStorage['fiatPrices']> => {
  const backgroundStorage = await getBackgroundStorage();
  return backgroundStorage?.fiatPrices;
};

/**
 * Deletes the specified `keys` from the background storage.
 *
 * If no `keys` are passed then **ALL** of it is cleared.
 *
 * @param keys Optional. List of keys to delete from storage
 */
export const clearBackgroundStorage = async (keys?: BackgroundStorageKeys[]): Promise<void> => {
  if (!keys?.length) {
    await webStorage.local.remove('BACKGROUND_STORAGE');
    return;
  }
  const backgroundStorage = await getBackgroundStorage();

  for (const key of keys) delete backgroundStorage?.[key];
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

/**
 * getDappInfo
 * @param origin - URL of website calling dApp connector
 * @returns {Promise<Wallet.DappInfo>}
 */
export const getDappInfo = async (origin: Origin): Promise<Wallet.DappInfo> =>
  await tabs.query({ url: `${origin}/*` }).then((t) => ({
    logo: t[0].favIconUrl || getRandomIcon({ id: origin, size: 40 }),
    name: t[0].title || origin.split('//')[1],
    url: origin
  }));

const calculatePopupWindowPositionAndSize = (
  window: Windows.Window,
  popup: WindowSize
): WindowSizeAndPositionProps => ({
  // eslint-disable-next-line no-magic-numbers
  top: Math.floor(window.top + (window.height - POPUP_WINDOW.height) / 2),
  // eslint-disable-next-line no-magic-numbers
  left: Math.floor(window.left + (window.width - POPUP_WINDOW.width) / 2),
  ...popup
});

const createTab = async (url: string, active = false) =>
  tabs.create({
    url: runtime.getURL(url),
    active
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
 * @returns tab - Tab of currently launched dApp connector
 */
export const launchCip30Popup = async (url: string): Promise<Tabs.Tab> => {
  const currentWindow = await windows.getCurrent();
  const tab = await createTab(`../dappConnector.html${url}`);
  const newWindow = await createWindow(
    tab.id,
    calculatePopupWindowPositionAndSize(currentWindow, POPUP_WINDOW),
    'popup',
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

export const ensureUiIsOpenAndLoaded = async (url?: string): Promise<Tabs.Tab> => {
  // Close all preeviously opened cip30 popups
  const openTabs = await tabs.query({ windowType: 'popup' });
  for (const tab of openTabs) {
    windows.remove(tab.windowId);
  }

  const tab = await launchCip30Popup(url);
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

export const getLastActiveTab: () => Promise<Tabs.Tab> = async () =>
  await (
    await tabs.query({ currentWindow: true, active: true })
  )[0];

export const convertToAssetName = (str: string): Wallet.Cardano.AssetName => {
  try {
    const hexAssetName = Buffer.from(str).toString('hex');
    return Wallet.Cardano.AssetName(hexAssetName);
  } catch (error) {
    // the api has inconsistent data, not all assets name comes decoded
    console.log(`unable to parse asset name: ${error.message}`);
  }

  return '' as unknown as Wallet.Cardano.AssetName;
};
