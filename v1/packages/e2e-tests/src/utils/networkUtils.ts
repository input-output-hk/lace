import MainLoader from '../elements/MainLoader';
import Modal from '../elements/modal';
import PrivacyPolicyUpdateBanner from '../elements/PrivacyPolicyUpdateBanner';
import ToastMessage from '../elements/toastMessage';
import MenuHeader from '../elements/menuHeader';
import NetworkDrawer from '../elements/settings/NetworkDrawer';
import type { NetworkType } from '../types/network';
import SettingsPage from '../elements/settings/SettingsPage';
import localStorageManager from './localStorageManager';

export const waitUntilHdWalletSynced = async (): Promise<void> => {
  await MainLoader.waitUntilLoaderDisappears();
  await Modal.waitUntilSyncingModalDisappears();
  await ToastMessage.closeWalletSyncedToast();
  await PrivacyPolicyUpdateBanner.closePrivacyPolicyUpdateBanner();
  await Modal.confirmMultiAddressModal();
};

export const switchNetworkWithoutClosingDrawer = async (network: NetworkType): Promise<void> => {
  await MenuHeader.openSettings();
  await SettingsPage.clickSettingsItem('Network');
  if (!(await NetworkDrawer.isNetworkSelected(network))) {
    await NetworkDrawer.clickOnNetworkRadioButton(network);
    await browser.waitUntil(
      async () => JSON.parse(await localStorageManager.getItem('appSettings')).chainName === network
    );
  }
};

export const switchNetworkAndCloseDrawer = async (network: NetworkType, mode: 'extended' | 'popup'): Promise<void> => {
  await switchNetworkWithoutClosingDrawer(network);
  await waitUntilHdWalletSynced();
  await (mode === 'extended' ? NetworkDrawer.clickCloseDrawerButton() : NetworkDrawer.clickBackDrawerButton());
};
