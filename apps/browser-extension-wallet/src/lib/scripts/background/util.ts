/* eslint-disable no-magic-numbers */
import { POPUP_WINDOW, POPUP_WINDOW_NAMI, POPUP_WINDOW_NAMI_TITLE } from '@src/utils/constants';
import { runtime, Tabs, tabs, Windows, windows } from 'webextension-polyfill';
import { Wallet } from '@lace/cardano';
import { BackgroundStorage } from '../types';
import { firstValueFrom } from 'rxjs';
import {
  AnyWallet,
  Bip32WalletAccount,
  WalletManagerApi,
  WalletRepositoryApi,
  WalletType
} from '@cardano-sdk/web-extension';
import { getBackgroundStorage } from './storage';

const { blake2b } = Wallet.Crypto;
const DAPP_CONNECTOR_REGEX = new RegExp(/dappconnector/i);

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

const calculatePopupWindowPositionAndSize = (
  window: Windows.Window,
  popup: WindowSize
): WindowSizeAndPositionProps => ({
  top: Math.floor(window.top + (window.height - popup.height) / 2),
  left: Math.floor(window.left + (window.width - popup.width) / 2),
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
 * @returns tab - Tab of currently launched dApp connector
 */
export const launchCip30Popup = async (url: string): Promise<Tabs.Tab> => {
  const currentWindow = await windows.getCurrent();
  const tab = await createTab(`../dappConnector.html${url}`, false);
  const { namiMigration } = await getBackgroundStorage();
  const windowSize = namiMigration?.mode === 'nami' ? POPUP_WINDOW_NAMI : POPUP_WINDOW;

  const newWindow = await createWindow(
    tab.id,
    calculatePopupWindowPositionAndSize(currentWindow, windowSize),
    'popup',
    true
  );
  newWindow.alwaysOnTop = true;
  return tab;
};

const waitForTabLoad = (tab: Tabs.Tab) =>
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
}: WalletManagementServices): Promise<
  | {
      wallet: AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>;
      account?: Bip32WalletAccount<Wallet.AccountMetadata>;
    }
  | undefined
> => {
  const activeWallet = await firstValueFrom(walletManager.activeWalletId$);
  if (!activeWallet) return;
  const wallets = await firstValueFrom(walletRepository.wallets$);
  // eslint-disable-next-line consistent-return
  const wallet = wallets.find(({ walletId }) => walletId === activeWallet.walletId);
  if (!wallet) return;
  const account =
    wallet.type === WalletType.Script
      ? undefined
      : wallet.accounts.find((acc) => activeWallet.accountIndex === acc.accountIndex);
  // eslint-disable-next-line consistent-return
  return { wallet, account };
};

export const closeAllLaceOrNamiTabs = async (shouldRemoveTab?: (url: string) => boolean): Promise<void> => {
  const openTabs = await tabs.query({ title: 'Lace' });
  const namiTabs = await tabs.query({ title: POPUP_WINDOW_NAMI_TITLE });
  openTabs.push(...namiTabs);
  // Close all previously opened lace dapp connector windows
  for (const tab of openTabs) {
    if (!shouldRemoveTab || shouldRemoveTab(tab.url)) await tabs.remove(tab.id);
  }
};

export const ensureUiIsOpenAndLoaded = async (url?: string): Promise<Tabs.Tab> => {
  await closeAllLaceOrNamiTabs((tabUrl) => DAPP_CONNECTOR_REGEX.test(tabUrl));

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

export const hashExtendedAccountPublicKey = (extendedAccountPublicKey: string): string => {
  const input = Buffer.from(extendedAccountPublicKey);
  return blake2b(blake2b.BYTES_MIN).update(input).digest('hex');
};
