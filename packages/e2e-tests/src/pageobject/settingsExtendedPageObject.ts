import GeneralSettingsDrawer from '../elements/settings/extendedView/generalSettingsDrawer';
import SettingsPage from '../elements/settings/extendedView/settingsPage';
import NetworkSettingsDrawer from '../elements/settings/extendedView/networkSettingsDrawer';
import menuHeaderPageObject from './menuHeaderPageObject';
import simpleTxSideDrawerPageObject from './simpleTxSideDrawerPageObject';
import localStorageManager from '../utils/localStorageManager';

class SettingsExtendedPageObject {
  clickOnAbout = async () => {
    await SettingsPage.aboutLink.element.click();
  };

  clickOnCollateral = async () => await SettingsPage.collateralLink.element.click();

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

  clickOnRemoveWallet = async () => await SettingsPage.removeWalletButton.click();

  clickOnShowPublicKey = async () => await GeneralSettingsDrawer.showPublicKeyButton.click();

  clickOnNetworkRadioButton = async (network: 'Mainnet' | 'Preprod' | 'Preview') => {
    switch (network) {
      case 'Mainnet':
        await NetworkSettingsDrawer.mainnetRadioButton.click();
        break;
      case 'Preprod':
        await NetworkSettingsDrawer.preprodRadioButton.click();
        break;
      case 'Preview':
        await NetworkSettingsDrawer.previewRadioButton.click();
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
    }
  };

  switchNetwork = async (network: 'Mainnet' | 'Preprod' | 'Preview', mode: 'extended' | 'popup') => {
    await menuHeaderPageObject.openSettings();
    await this.clickOnNetwork();
    await browser.pause(1000);
    await this.clickOnNetworkRadioButton(network);
    await browser.waitUntil(
      async () => JSON.parse(await localStorageManager.getItem('appSettings')).chainName === network
    );
    await (mode === 'extended'
      ? simpleTxSideDrawerPageObject.clickCloseDrawerButton()
      : simpleTxSideDrawerPageObject.clickBackDrawerButton());
  };
}

export default new SettingsExtendedPageObject();
