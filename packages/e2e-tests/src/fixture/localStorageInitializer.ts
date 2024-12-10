import testContext from '../utils/testContext';
import extensionUtils from '../utils/utils';
import { cleanBrowserStorage } from '../utils/browserStorage';
import localStorageManager from '../utils/localStorageManager';
import { browser } from '@wdio/globals';
import { closeAllTabsExceptOriginalOne } from '../utils/window';
import { addAndActivateWalletsInRepository, clearWalletRepository } from './walletRepositoryInitializer';
import { TestWalletName } from '../support/walletConfiguration';

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

  async initializeAnalyticsStatus(value: 'ACCEPTED' | 'REJECTED'): Promise<void> {
    await localStorageManager.setItem('analyticsStatus', JSON.stringify(value));
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

  enableShowingAnalyticsBanner = async () => {
    await localStorageManager.setItem('analyticsStatus', '');
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

    await this.initializeAnalyticsStatus('ACCEPTED');
    await this.initializeShowDAppBetaModal(false);
    await this.initializeAppSettings();
    await this.disableShowPinExtension();
    await localStorageManager.setItem('wallet', `{"name":"${walletName}"}`);
  };

  reInitializeWallet = async (walletName: string) => {
    await clearWalletRepository();
    await cleanBrowserStorage();
    await localStorageManager.cleanLocalStorage();
    await this.initialiseBasicLocalStorageData(walletName);
    await addAndActivateWalletsInRepository([walletName as TestWalletName]);
    await browser.refresh();
    await closeAllTabsExceptOriginalOne();
  };
}

export default new LocalStorageInitializer();
