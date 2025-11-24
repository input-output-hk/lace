/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';
import AboutLaceWidget from './extendedView/AboutLaceWidget';
import { SettingsLink } from './SettingsLink';
import CommonDrawerElements from '../CommonDrawerElements';
import { ChainablePromiseArray } from 'webdriverio/build/types';

export type SettingsElementName =
  | 'About'
  | 'Your keys'
  | 'Network'
  | 'Authorized DApps'
  | 'Show recovery phrase'
  | 'Passphrase verification'
  | 'FAQs'
  | 'Help'
  | 'Terms and conditions'
  | 'Privacy policy'
  | 'Collateral'
  | 'Cookie policy'
  | 'Custom Submit API'
  | 'Generate paper wallet';

class SettingsPage extends CommonDrawerElements {
  private readonly WALLET_HEADER = '[data-testid="wallet-settings-heading"]';
  private readonly SECURITY_HEADER = '[data-testid="security-settings-heading"]';
  private readonly SUPPORT_HEADER = '[data-testid="support-settings-heading"]';
  private readonly LEGAL_HEADER = '[data-testid="legal-settings-heading"]';
  private readonly PREFERENCES_HEADER = '[data-testid="wallet-preferences-heading"]';
  private readonly MAIN_TITLE = '[data-testid="settings-page-title"]';
  private readonly REMOVE_WALLET_HEADER = '[data-testid="remove-wallet-heading"]';
  private readonly REMOVE_WALLET_DESCRIPTION = '[data-testid="remove-wallet-description"]';
  private readonly REMOVE_WALLET_BUTTON = '[data-testid="remove-wallet-button"]';
  private readonly SECURITY_SETTINGS_ELEMENTS = '[data-testid="security-settings-heading"] + div';
  private readonly SYNC_BUTTON = '[data-testid="settings-wallet-wallet-sync-cta"]';

  private readonly ABOUT_LINK = 'settings-wallet-about-link';
  private readonly NETWORK_LINK_TEST_ID = 'settings-wallet-network-link';
  private readonly DAPPS_LINK_TEST_ID = 'settings-wallet-authorized-dapps-link';
  private readonly YOUR_KEYS_LINK_TEST_ID = 'settings-wallet-general-link';
  private readonly COLLATERAL_LINK_TEST_ID = 'settings-wallet-collateral-link';
  private readonly CUSTOM_SUBMIT_API_LINK_TEST_ID = 'settings-wallet-custom-submit-api-link';
  private readonly THEME_SWITCH_TEST_ID = '[data-testid="switch"]';
  private readonly BETA_PROGRAM_SWITCH_TEST_ID = '[data-testid="settings-beta-program-switch"]';
  private readonly SHOW_RECOVERY_PHRASE_LINK_TEST_ID = 'settings-show-recovery-phrase-link';
  private readonly GENERATE_PAPER_WALLET_LINK_TEST_ID = 'settings-generate-paperwallet-link';
  private readonly PASSPHRASE_VERIFICATION_LINK_TEST_ID = 'settings-passphrase-verification-link';
  private readonly FAQS_LINK_TEST_ID = 'settings-support-faqs-link';
  private readonly HELP_LINK_TEST_ID = 'settings-support-help-link';
  private readonly TNC_LINK_TEST_ID = 'settings-legal-tnc-link';
  private readonly PRIVACY_POLICY_LINK_TEST_ID = 'settings-legal-privacy-policy-link';
  private readonly COOKIE_POLICY_LINK_TEST_ID = 'settings-legal-cookie-policy-link';
  private readonly WALLET_SYNC_LINK_TEST_ID = 'settings-wallet-wallet-sync';
  private readonly CURRENCY_LINK_TEST_ID = 'settings-wallet-currency-link';
  private readonly THEME_LINK_TEST_ID = 'settings-wallet-theme';
  private readonly BETA_PROGRAM_LINK_TEST_ID = 'settings-beta-program-section';
  private readonly DEBUGGING_LINK_TEST_ID = 'settings-logging-level-section';
  private readonly DEBUGGING_SWITCH_TEST_ID = '[data-testid="settings-logging-switch"]';

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

  get preferencesHeader(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PREFERENCES_HEADER);
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

  get hdWalletSyncLink() {
    return new SettingsLink(this.WALLET_SYNC_LINK_TEST_ID);
  }

  get currencyLink() {
    return new SettingsLink(this.CURRENCY_LINK_TEST_ID);
  }

  get themeLink() {
    return new SettingsLink(this.THEME_LINK_TEST_ID);
  }

  get betaProgramLink() {
    return new SettingsLink(this.BETA_PROGRAM_LINK_TEST_ID);
  }

  get debuggingLink() {
    return new SettingsLink(this.DEBUGGING_LINK_TEST_ID);
  }

  get customSubmitAPILink() {
    return new SettingsLink(this.CUSTOM_SUBMIT_API_LINK_TEST_ID);
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

  get generatePaperWallet() {
    return new SettingsLink(this.GENERATE_PAPER_WALLET_LINK_TEST_ID);
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

  get themeSwitch(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.THEME_SWITCH_TEST_ID);
  }

  get betaProgramSwitch(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.BETA_PROGRAM_SWITCH_TEST_ID);
  }

  get debuggingSwitch(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DEBUGGING_SWITCH_TEST_ID);
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

  async clickBetaProgramSwitch(): Promise<void> {
    await this.betaProgramSwitch.waitForClickable();
    await this.betaProgramSwitch.click();
  }

  async setExtensionTheme(mode: 'light' | 'dark'): Promise<void> {
    if (mode !== ((await this.themeSwitch.getAttribute('aria-checked')) === 'true' ? 'light' : 'dark')) {
      await this.themeSwitch.waitForClickable();
      await this.themeSwitch.click();
    }
  }

  async clickOnRemoveWallet(): Promise<void> {
    await this.removeWalletButton.waitForStable();
    await this.removeWalletButton.click();
  }

  async toggleDebugging(isEnabled: boolean): Promise<void> {
    (await this.debuggingSwitch.getAttribute('aria-checked')) !== String(isEnabled) &&
      (await this.debuggingSwitch.click());
  }

  private readonly elementActions: Record<SettingsElementName, () => Promise<void>> = {
    About: async () => {
      await this.aboutLink.element.waitForClickable();
      await this.aboutLink.element.click();
    },
    'Your keys': async () => {
      await this.yourKeysLink.element.waitForClickable();
      await this.yourKeysLink.element.click();
    },
    Network: async () => {
      await this.networkLink.element.waitForClickable();
      await this.networkLink.element.click();
    },
    'Authorized DApps': async () => {
      await this.authorizedDAppsLink.element.waitForClickable();
      await this.authorizedDAppsLink.element.click();
    },
    'Show recovery phrase': async () => {
      await this.showRecoveryPhraseLink.element.waitForClickable();
      await this.showRecoveryPhraseLink.element.click();
    },
    'Passphrase verification': async () => {
      await this.passphraseVerificationLink.element.waitForClickable();
      await this.passphraseVerificationLink.element.click();
    },
    FAQs: async () => {
      await this.faqsLink.element.waitForClickable();
      await this.faqsLink.element.click();
    },
    Help: async () => {
      await this.helpLink.element.waitForClickable();
      await this.helpLink.element.click();
    },
    'Terms and conditions': async () => {
      await this.tncLink.element.waitForClickable();
      await this.tncLink.element.click();
    },
    'Privacy policy': async () => {
      await this.privacyPolicyLink.element.waitForClickable();
      await this.privacyPolicyLink.element.click();
    },
    Collateral: async () => {
      await this.collateralLink.element.waitForClickable();
      await this.collateralLink.element.click();
    },
    'Cookie policy': async () => {
      await this.cookiePolicy.element.waitForClickable();
      await this.cookiePolicy.element.click();
    },
    'Custom Submit API': async () => {
      await this.customSubmitAPILink.element.waitForClickable();
      await this.customSubmitAPILink.element.click();
    },
    'Generate paper wallet': async () => {
      await this.generatePaperWallet.element.waitForClickable();
      await this.generatePaperWallet.element.click();
    }
  };

  clickSettingsItem = async (elementName: SettingsElementName): Promise<void> => {
    const action = this.elementActions[elementName];
    if (!action) {
      const supportedElements = Object.keys(this.elementActions).join(', ');
      throw new Error(`Unsupported element: "${elementName}". Supported elements: ${supportedElements}`);
    }

    await action();
  };
}

export default new SettingsPage();
