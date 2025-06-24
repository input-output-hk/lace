import SettingsPage from '../elements/settings/SettingsPage';
import NetworkDrawer from '../elements/settings/NetworkDrawer';
import localStorageManager from '../utils/localStorageManager';
import Modal from '../elements/modal';
import { browser } from '@wdio/globals';
import MainLoader from '../elements/MainLoader';
import MenuHeader from '../elements/menuHeader';
import PrivacyPolicyUpdateBanner from '../elements/PrivacyPolicyUpdateBanner';
import ToastMessage from '../elements/toastMessage';
import type { NetworkType } from '../types/network';

const toggleEnabledAttribute = 'aria-checked';

class SettingsExtendedPageObject {
  clickOnAbout = async () => {
    await SettingsPage.aboutLink.element.click();
  };

  clickOnCollateral = async () => await SettingsPage.collateralLink.element.click();

  clickOnCustomSubmitAPI = async () => {
    await SettingsPage.customSubmitAPILink.element.waitForClickable();
    await SettingsPage.customSubmitAPILink.element.click();
  };

  clickOnGeneratePaperWallet = async () => {
    await SettingsPage.generatePaperWallet.element.waitForClickable();
    await SettingsPage.generatePaperWallet.element.click();
  };

  clickOnCookiePolicy = async () => await SettingsPage.cookiePolicy.element.click();

  clickOnYourKeys = async () => await SettingsPage.yourKeysLink.element.click();

  clickOnNetwork = async () => await SettingsPage.networkLink.element.click();

  clickOnAuthorizedDApps = async () => await SettingsPage.authorizedDAppsLink.element.click();

  clickOnShowPassphrase = async () => await SettingsPage.showRecoveryPhraseLink.element.click();

  clickOnPassphraseVerification = async () => await SettingsPage.passphraseVerificationLink.element.click();

  clickOnFaqs = async () => await SettingsPage.faqsLink.element.click();

  clickOnHelp = async () => await SettingsPage.helpLink.element.click();

  clickOnTermsAndConditions = async () => await SettingsPage.tncLink.element.click();

  clickOnPrivacyPolicy = async () => await SettingsPage.privacyPolicyLink.element.click();

  clickOnRemoveWallet = async () => {
    await SettingsPage.removeWalletButton.waitForStable();
    await SettingsPage.removeWalletButton.click();
  };

  toggleDebugging = async (isEnabled: boolean) => {
    (await SettingsPage.debuggingSwitch.getAttribute(toggleEnabledAttribute)) !== String(isEnabled) &&
      (await SettingsPage.debuggingSwitch.click());
  };

  // eslint-disable-next-line complexity
  clickSettingsItem = async (elementName: string): Promise<void> => {
    await browser.pause(500);
    switch (elementName) {
      case 'About':
        await this.clickOnAbout();
        break;
      case 'Your keys':
        await this.clickOnYourKeys();
        break;
      case 'Network':
        await this.clickOnNetwork();
        break;
      case 'Authorized DApps':
        await this.clickOnAuthorizedDApps();
        break;
      case 'Show recovery phrase':
        await this.clickOnShowPassphrase();
        break;
      case 'Passphrase verification':
        await this.clickOnPassphraseVerification();
        break;
      case 'FAQs':
        await this.clickOnFaqs();
        break;
      case 'Help':
        await this.clickOnHelp();
        break;
      case 'Terms and conditions':
        await this.clickOnTermsAndConditions();
        break;
      case 'Privacy policy':
        await this.clickOnPrivacyPolicy();
        break;
      case 'Collateral':
        await this.clickOnCollateral();
        break;
      case 'Cookie policy':
        await this.clickOnCookiePolicy();
        break;
      case 'Custom Submit API':
        await this.clickOnCustomSubmitAPI();
        break;
      case 'Generate paper wallet':
        await this.clickOnGeneratePaperWallet();
        break;
      default:
        throw new Error(`Unsupported element: ${elementName}`);
    }
  };

  switchNetworkWithoutClosingDrawer = async (network: NetworkType) => {
    await MenuHeader.openSettings();
    await this.clickOnNetwork();
    if (!(await NetworkDrawer.isNetworkSelected(network))) {
      await NetworkDrawer.clickOnNetworkRadioButton(network);
      await browser.waitUntil(
        async () => JSON.parse(await localStorageManager.getItem('appSettings')).chainName === network
      );
    }
  };

  switchNetworkAndCloseDrawer = async (network: NetworkType, mode: 'extended' | 'popup') => {
    await this.switchNetworkWithoutClosingDrawer(network);
    await this.waitUntilHdWalletSynced();
    await (mode === 'extended' ? NetworkDrawer.clickCloseDrawerButton() : NetworkDrawer.clickBackDrawerButton());
  };

  async waitUntilHdWalletSynced() {
    await MainLoader.waitUntilLoaderDisappears();
    await Modal.waitUntilSyncingModalDisappears();
    await ToastMessage.closeWalletSyncedToast();
    await PrivacyPolicyUpdateBanner.closePrivacyPolicyUpdateBanner();
    await Modal.confirmMultiAddressModal();
  }
}

export default new SettingsExtendedPageObject();
