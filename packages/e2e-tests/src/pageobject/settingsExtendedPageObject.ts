import YourKeysDrawer from '../elements/settings/YourKeysDrawer';
import SettingsPage from '../elements/settings/SettingsPage';
import NetworkDrawer from '../elements/settings/NetworkDrawer';
import localStorageManager from '../utils/localStorageManager';
import Modal from '../elements/modal';
import { browser } from '@wdio/globals';
import ToastMessage from '../elements/toastMessage';
import { t } from '../utils/translationService';
import { Logger } from '../support/logger';
import { expect } from 'chai';
import MainLoader from '../elements/MainLoader';
import MenuHeader from '../elements/menuHeader';

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

  clickOnShowPublicKey = async () => {
    await YourKeysDrawer.showPublicKeyButton.waitForStable();
    await YourKeysDrawer.showPublicKeyButton.click();
  };

  clickOnNetworkRadioButton = async (network: 'Mainnet' | 'Preprod' | 'Preview') => {
    switch (network) {
      case 'Mainnet':
        await NetworkDrawer.mainnetRadioButton.waitForClickable();
        await NetworkDrawer.mainnetRadioButton.click();
        break;
      case 'Preprod':
        await NetworkDrawer.preprodRadioButton.waitForClickable();
        await NetworkDrawer.preprodRadioButton.click();
        break;
      case 'Preview':
        await NetworkDrawer.previewRadioButton.waitForClickable();
        await NetworkDrawer.previewRadioButton.click();
        break;
    }
  };

  toggleAnalytics = async (isEnabled: 'true' | 'false') => {
    (await SettingsPage.analyticsSwitch.getAttribute('aria-checked')) !== isEnabled &&
      (await SettingsPage.analyticsSwitch.click());
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

  switchNetworkWithoutClosingDrawer = async (network: 'Mainnet' | 'Preprod' | 'Preview') => {
    await MenuHeader.openSettings();
    await this.clickOnNetwork();
    await this.clickOnNetworkRadioButton(network);
    await browser.waitUntil(
      async () => JSON.parse(await localStorageManager.getItem('appSettings')).chainName === network
    );
  };

  switchNetworkAndCloseDrawer = async (network: 'Mainnet' | 'Preprod' | 'Preview', mode: 'extended' | 'popup') => {
    await this.switchNetworkWithoutClosingDrawer(network);
    await this.waitUntilHdWalletSynced();
    await (mode === 'extended' ? NetworkDrawer.clickCloseDrawerButton() : NetworkDrawer.clickBackDrawerButton());
  };

  removeWallet = async () => {
    await MenuHeader.openSettings();
    await this.clickOnRemoveWallet();
    await Modal.confirmButton.click();
  };

  setExtensionTheme = async (mode: 'light' | 'dark') => {
    if (mode !== ((await SettingsPage.themeSwitch.getAttribute('aria-checked')) === 'true' ? 'light' : 'dark')) {
      await SettingsPage.themeSwitch.waitForClickable();
      await SettingsPage.themeSwitch.click();
    }
  };
  closeWalletSyncedToast = async () => {
    if (await ToastMessage.container.isDisplayed()) {
      const toastMessage = await (await ToastMessage.messageText).getText();
      if (toastMessage === (await t('addressesDiscovery.toast.successText')).toString()) {
        await ToastMessage.clickCloseButton();
      } else {
        Logger.warn('Wallet synced toast is not displayed, you might want to remove this step');
      }
    }
  };

  waitUntilSyncingModalDisappears = async () => {
    await browser.pause(500);
    if (
      (await Modal.container.isDisplayed()) &&
      (await Modal.title.getText()) === (await t('addressesDiscovery.overlay.title'))
    ) {
      await Modal.title.waitForDisplayed({ reverse: true, timeout: 220_000 });
    }
  };

  async waitUntilHdWalletSynced() {
    await MainLoader.waitUntilLoaderDisappears();
    await this.waitUntilSyncingModalDisappears();
    await this.closeWalletSyncedToast();
    await this.multiAddressModalConfirm();
  }

  async multiAddressModalConfirm() {
    if (await Modal.container.isDisplayed()) {
      expect(await Modal.confirmButton.getText()).to.equal(await t('modals.beta.button', 'staking'));
      await Modal.confirmButton.click();
    }
  }
}

export default new SettingsExtendedPageObject();
