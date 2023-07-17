import { getTestWallet, WalletConfig } from '../support/walletConfiguration';
import testContext from '../utils/testContext';
import { initializeBrowserStorage } from './browserStorageInitializer';
import extensionUtils from '../utils/utils';
import { cleanBrowserStorage } from '../utils/browserStorage';
import localStorageManager from '../utils/localStorageManager';
import { browser } from '@wdio/globals';

class LocalStorageInitializer {
  async initializeLastStaking(): Promise<void> {
    await localStorageManager.setItem('lastStaking', JSON.stringify({}));
  }

  async initializeTrackingConsent(allowAnalytics: boolean): Promise<void> {
    await localStorageManager.setItem('doesUserAllowAnalytics', JSON.stringify(allowAnalytics));
  }

  async initializeMode(mode: 'light' | 'dark'): Promise<void> {
    await localStorageManager.setItem('mode', JSON.stringify(mode));
  }

  async initializeAppSettings(): Promise<void> {
    const network = extensionUtils.getNetwork().name;
    const appSettings = `{"chainName":"${network}","mnemonicVerificationFrequency":"","lastMnemonicVerification":"1677144507426"}`;
    await localStorageManager.setItem('appSettings', appSettings);
  }

  async initializeKeyAgentData(walletName = 'TestAutomationWallet'): Promise<void> {
    const network = extensionUtils.getNetwork().name;
    const wallet: WalletConfig =
      walletName === 'newCreatedWallet' ? testContext.load('newCreatedWallet') : getTestWallet(walletName);
    const keyAgentData = JSON.parse(String(wallet?.backgroundStorage?.keyAgentsByChain));

    await localStorageManager.setItem('keyAgentData', JSON.stringify(keyAgentData[network].keyAgentData));
  }

  async initializeWallet(walletName = 'TestAutomationWallet') {
    // Pause fix for flaky tests where local storage keys are disappearing when executed right after opening the extension
    await browser.pause(500);
    const wallet: WalletConfig =
      walletName === 'newCreatedWallet' ? testContext.load('newCreatedWallet') : getTestWallet(walletName);
    // Initialize 'Lock' only for TestAutomationWallet where we are triggering passphrase tests
    if (walletName === 'TestAutomationWallet')
      await localStorageManager.setItem('lock', String(wallet?.walletLocalStorageData?.lock));
    testContext.saveWithOverride('activeWallet', walletName);
    await localStorageManager.setItem('wallet', String(wallet?.walletLocalStorageData?.wallet));
    await localStorageManager.setItem('analyticsAccepted', String(wallet?.walletLocalStorageData?.analyticsAccepted));
    await localStorageManager.setItem('showDappBetaModal', 'false');
    await initializeBrowserStorage(wallet);
    await this.initializeAppSettings();
    await this.initializeKeyAgentData(walletName);
  }

  reInitializeWallet = async (walletName: string) => {
    await cleanBrowserStorage();
    await localStorageManager.cleanLocalStorage();
    await this.initializeWallet(walletName);
    await browser.refresh();
  };
}

export default new LocalStorageInitializer();
