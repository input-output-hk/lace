/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';
import AboutLaceWidget from './extendedView/AboutLaceWidget';
import { SettingsLink } from './SettingsLink';
import CommonDrawerElements from '../CommonDrawerElements';
import { ChainablePromiseArray } from 'webdriverio/build/types';

class SettingsPage extends CommonDrawerElements {
  private readonly WALLET_HEADER = '[data-testid="wallet-settings-heading"]';
  private readonly SECURITY_HEADER = '[data-testid="security-settings-heading"]';
  private readonly SUPPORT_HEADER = '[data-testid="support-settings-heading"]';
  private readonly LEGAL_HEADER = '[data-testid="legal-settings-heading"]';
  private readonly MAIN_TITLE = '[data-testid="settings-page-title"]';
  private readonly REMOVE_WALLET_HEADER = '[data-testid="remove-wallet-heading"]';
  private readonly REMOVE_WALLET_DESCRIPTION = '[data-testid="remove-wallet-description"]';
  private readonly REMOVE_WALLET_BUTTON = '[data-testid="remove-wallet-button"]';
  private readonly ANALYTICS_SWITCH = '[data-testid="settings-analytics-switch"]';
  private readonly SECURITY_SETTINGS_ELEMENTS = '[data-testid="security-settings-heading"] + div';
  private readonly SYNC_BUTTON = '[data-testid="settings-wallet-wallet-sync-cta"]';

  private readonly ABOUT_LINK = 'settings-wallet-about-link';
  private readonly NETWORK_LINK_TEST_ID = 'settings-wallet-network-link';
  private readonly DAPPS_LINK_TEST_ID = 'settings-wallet-authorized-dapps-link';
  private readonly YOUR_KEYS_LINK_TEST_ID = 'settings-wallet-general-link';
  private readonly COLLATERAL_LINK_TEST_ID = 'settings-wallet-collateral-link';
  private readonly THEME_SWITCH_TEST_ID = '[data-testid="switch"]';
  private readonly SHOW_RECOVERY_PHRASE_LINK_TEST_ID = 'settings-show-recovery-phrase-link';
  private readonly PASSPHRASE_VERIFICATION_LINK_TEST_ID = 'settings-passphrase-verification-link';
  private readonly ANALYTICS_LINK_TEST_ID = 'settings-analytics-section';
  private readonly FAQS_LINK_TEST_ID = 'settings-support-faqs-link';
  private readonly HELP_LINK_TEST_ID = 'settings-support-help-link';
  private readonly TNC_LINK_TEST_ID = 'settings-legal-tnc-link';
  private readonly PRIVACY_POLICY_LINK_TEST_ID = 'settings-legal-privacy-policy-link';
  private readonly COOKIE_POLICY_LINK_TEST_ID = 'settings-legal-cookie-policy-link';

  get aboutLaceWidget(): typeof AboutLaceWidget {
    return AboutLaceWidget;
  }

  get walletHeader(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.WALLET_HEADER);
  }

  get securityHeader(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SECURITY_HEADER);
  }

  get supportHeader(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SUPPORT_HEADER);
  }

  get legalHeader(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.LEGAL_HEADER);
  }

  get removeWalletHeader(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.REMOVE_WALLET_HEADER);
  }

  get removeWalletDescription(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.REMOVE_WALLET_DESCRIPTION);
  }

  get removeWalletButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.REMOVE_WALLET_BUTTON);
  }

  get mainTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MAIN_TITLE);
  }

  // About section exists in popup view only
  get aboutLink() {
    return new SettingsLink(this.ABOUT_LINK);
  }

  get networkLink() {
    return new SettingsLink(this.NETWORK_LINK_TEST_ID);
  }

  get authorizedDAppsLink() {
    return new SettingsLink(this.DAPPS_LINK_TEST_ID);
  }

  get collateralLink() {
    return new SettingsLink(this.COLLATERAL_LINK_TEST_ID);
  }

  get yourKeysLink() {
    return new SettingsLink(this.YOUR_KEYS_LINK_TEST_ID);
  }

  get passphraseVerificationLink() {
    return new SettingsLink(this.PASSPHRASE_VERIFICATION_LINK_TEST_ID);
  }

  get showRecoveryPhraseLink() {
    return new SettingsLink(this.SHOW_RECOVERY_PHRASE_LINK_TEST_ID);
  }

  get analyticsLink() {
    return new SettingsLink(this.ANALYTICS_LINK_TEST_ID);
  }

  get faqsLink() {
    return new SettingsLink(this.FAQS_LINK_TEST_ID);
  }

  get helpLink() {
    return new SettingsLink(this.HELP_LINK_TEST_ID);
  }

  get tncLink() {
    return new SettingsLink(this.TNC_LINK_TEST_ID);
  }

  get privacyPolicyLink() {
    return new SettingsLink(this.PRIVACY_POLICY_LINK_TEST_ID);
  }

  get cookiePolicy() {
    return new SettingsLink(this.COOKIE_POLICY_LINK_TEST_ID);
  }

  get analyticsSwitch(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ANALYTICS_SWITCH);
  }

  get themeSwitch(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.THEME_SWITCH_TEST_ID);
  }

  get securitySettingsElements(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $$(this.SECURITY_SETTINGS_ELEMENTS);
  }

  get syncButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SYNC_BUTTON);
  }

  async clickSyncButton(): Promise<void> {
    await this.syncButton.waitForClickable();
    await this.syncButton.click();
  }
}

export default new SettingsPage();
