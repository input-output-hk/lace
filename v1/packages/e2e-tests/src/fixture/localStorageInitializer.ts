import testContext from '../utils/testContext';
import extensionUtils from '../utils/utils';
import localStorageManager from '../utils/localStorageManager';
import { browser } from '@wdio/globals';
import { closeAllTabsExceptOriginalOne } from '../utils/window';
import { addAndActivateWalletsInRepository } from './walletRepositoryInitializer';
import { TestWalletName } from '../support/walletConfiguration';
import extendedView from '../page/extendedView';

class LocalStorageInitializer {
  async initializeLastStaking(): Promise<void> {
    await localStorageManager.setItem('lastStaking', JSON.stringify({}));
  }

  async initializeMode(mode: 'light' | 'dark'): Promise<void> {
    await localStorageManager.setItem('mode', mode);
  }

  async initializeUnconfirmedTransactions(value: string): Promise<void> {
    await localStorageManager.setItem('unconfirmedTransactions', `[${value}]`);
  }

  async initializeShowDAppBetaModal(value: boolean): Promise<void> {
    await localStorageManager.setItem('showDappBetaModal', JSON.stringify(value));
  }

  async initializeShowMultiAddressDiscoveryModal(value: boolean): Promise<void> {
    await localStorageManager.setItem('showMultiAddressModal', `${value}`);
  }

  disableShowingMultidelegationBetaBanner = async () => {
    await localStorageManager.setItem('multidelegationFirstVisit', 'false');
  };

  disableShowingMultidelegationDAppsIssueModal = async () => {
    await localStorageManager.setItem('isMultiDelegationDAppCompatibilityModalVisible', 'false');
  };

  removeConfigurationForShowingMultidelegationDAppsIssueModal = async () => {
    await localStorageManager.removeItem('isMultiDelegationDAppCompatibilityModalVisible');
  };

  disableShowPinExtension = async () => {
    await localStorageManager.setItem('showPinExtension', 'false');
  };

  async initializeAppSettings(): Promise<void> {
    const network = extensionUtils.getNetwork().name;
    const appSettings = `{"chainName":"${network}"}`;
    await localStorageManager.setItem('appSettings', appSettings);
  }

  initialiseBasicLocalStorageData = async (walletName = 'TestAutomationWallet'): Promise<void> => {
    testContext.saveWithOverride('activeWallet', walletName);

    await this.initializeShowDAppBetaModal(false);
    await this.initializeAppSettings();
    await this.disableShowPinExtension();
    await localStorageManager.setItem('wallet', `{"name":"${walletName}"}`);
    await localStorageManager.setItem('hasUserAcknowledgedPrivacyPolicyUpdate', 'true');
  };

  reInitializeWallet = async (walletName: string) => {
    await browser.reloadSession();
    await extendedView.visit();
    await this.initialiseBasicLocalStorageData(walletName);
    await addAndActivateWalletsInRepository([walletName as TestWalletName]);
    await browser.refresh();
    await closeAllTabsExceptOriginalOne();
  };
}

export default new LocalStorageInitializer();
