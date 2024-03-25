import { getTestWallet, WalletConfig } from '../support/walletConfiguration';
import testContext from '../utils/testContext';
import { initializeBrowserStorage } from './browserStorageInitializer';
import extensionUtils from '../utils/utils';
import { cleanBrowserStorage } from '../utils/browserStorage';
import localStorageManager from '../utils/localStorageManager';
import { browser } from '@wdio/globals';
import { closeAllTabsExceptOriginalOne } from '../utils/window';
import { clearWalletRepository } from './walletRepositoryInitializer';

class LocalStorageInitializer {
  async initializeLastStaking(): Promise<void> {
    await localStorageManager.setItem('lastStaking', JSON.stringify({}));
  }

  async initializeTrackingConsent(allowAnalytics: boolean): Promise<void> {
    await localStorageManager.setItem('doesUserAllowAnalytics', JSON.stringify(allowAnalytics));
  }

  async initializeMode(mode: 'light' | 'dark'): Promise<void> {
    await localStorageManager.setItem('mode', mode);
  }

  async initializeAppSettings(): Promise<void> {
    const network = extensionUtils.getNetwork().name;
    const appSettings = `{"chainName":"${network}","mnemonicVerificationFrequency":"","lastMnemonicVerification":"1677144507426"}`;
    await localStorageManager.setItem('appSettings', appSettings);
  }

  async initializeKeyAgentData(walletName = 'TestAutomationWallet'): Promise<void> {
    const network = extensionUtils.getNetwork().name;
    const wallet: WalletConfig = getTestWallet(walletName);
    const keyAgentData = JSON.parse(String(wallet?.backgroundStorage?.keyAgentsByChain));

    await localStorageManager.setItem('keyAgentData', JSON.stringify(keyAgentData[network].keyAgentData));
  }

  async initializeUnconfirmedTransactions(value: string): Promise<void> {
    await localStorageManager.setItem('unconfirmedTransactions', `[${value}]`);
  }

  async initializeAnalyticsStatus(value: 'ACCEPTED' | 'REJECTED'): Promise<void> {
    await localStorageManager.setItem('analyticsStatus', value);
  }

  async initializeShowDAppBetaModal(value: boolean): Promise<void> {
    await localStorageManager.setItem('showDappBetaModal', JSON.stringify(value));
  }

  async initializeShowMultiAddressDiscoveryModal(value: boolean): Promise<void> {
    await localStorageManager.setItem('showMultiAddressModal', JSON.stringify(value));
  }

  async initializeWallet(walletName = 'TestAutomationWallet') {
    // Pause fix for flaky tests where local storage keys are disappearing when executed right after opening the extension
    await browser.pause(500);
    const wallet: WalletConfig = getTestWallet(walletName);
    // Initialize 'Lock' only for TestAutomationWallet where we are triggering passphrase tests
    if (walletName === 'TestAutomationWallet')
      await localStorageManager.setItem('lock', String(wallet?.walletLocalStorageData?.lock));
    testContext.saveWithOverride('activeWallet', walletName);
    await localStorageManager.setItem('wallet', String(wallet?.walletLocalStorageData?.wallet));
    await localStorageManager.setItem('analyticsStatus', wallet?.walletLocalStorageData?.analyticsStatus ?? 'ACCEPTED');
    await localStorageManager.setItem('showPinExtension', 'false');
    await this.initializeShowDAppBetaModal(false);
    await initializeBrowserStorage(wallet);
    await this.initializeAppSettings();
    await this.initializeKeyAgentData(walletName);
  }

  reInitializeWallet = async (walletName: string) => {
    await clearWalletRepository();
    await cleanBrowserStorage();
    await localStorageManager.cleanLocalStorage();
    await this.initializeWallet(walletName);
    await browser.refresh();
    await closeAllTabsExceptOriginalOne();
  };

  disableShowingMultidelegationBetaBanner = async () => {
    await localStorageManager.setItem('multidelegationFirstVisit', 'false');
  };

  disableShowingMultidelegationPersistenceBanner = async () => {
    await localStorageManager.setItem('multidelegationFirstVisitSincePortfolioPersistence', 'false');
  };

  enableShowingAnalyticsBanner = async () => {
    await localStorageManager.setItem('analyticsStatus', '');
  };

  initialiseBasicLocalStorageData = async (
    walletName: string,
    chainName: 'Preprod' | 'Preview' | 'Mainnet'
  ): Promise<void> => {
    await this.initializeAnalyticsStatus('ACCEPTED');
    await this.initializeShowDAppBetaModal(false);
    await localStorageManager.setItem('wallet', `{"name":"${walletName}"}`);
    await localStorageManager.setItem('appSettings', `{"chainName":"${chainName}"}`);
  };
}

export default new LocalStorageInitializer();
