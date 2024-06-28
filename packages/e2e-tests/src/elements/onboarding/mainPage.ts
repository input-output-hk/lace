/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';
import { getTestWallet, TestWalletName } from '../../support/walletConfiguration';
import CommonOnboardingElements from './commonOnboardingElements';
import recoveryPhrasePage from './recoveryPhrasePage';
import walletSetupPage from './walletSetupPage';
import topNavigationAssert from '../../assert/topNavigationAssert';

export class OnboardingMainPage extends CommonOnboardingElements {
  private LOGO_IMAGE = '[data-testid="wallet-setup-logo"]';
  private TITLE = '[data-testid="wallet-setup-title"]';
  private SUBTITLE = '[data-testid="wallet-setup-subtitle"]';
  private CREATE_WALLET_ICON = '[data-testid="create-wallet-icon"]';
  private CREATE_WALLET_TITLE = '[data-testid="create-wallet-title"]';
  private CREATE_WALLET_DESCRIPTION = '[data-testid="create-wallet-description"]';
  private CREATE_WALLET_BUTTON = '[data-testid="create-wallet-button"]';
  private HARDWARE_WALLET_ICON = '[data-testid="hardware-wallet-icon"]';
  private HARDWARE_WALLET_TITLE = '[data-testid="hardware-wallet-title"]';
  private HARDWARE_WALLET_DESCRIPTION = '[data-testid="hardware-wallet-description"]';
  private HARDWARE_WALLET_BUTTON = '[data-testid="hardware-wallet-button"]';
  private RESTORE_WALLET_ICON = '[data-testid="restore-wallet-icon"]';
  private RESTORE_WALLET_TITLE = '[data-testid="restore-wallet-title"]';
  private RESTORE_WALLET_DESCRIPTION = '[data-testid="restore-wallet-description"]';
  private RESTORE_WALLET_BUTTON = '[data-testid="restore-wallet-button"]';
  private AGREEMENT_TEXT = '[data-testid="agreement-text"]';
  private AGREEMENT_TERMS_OF_SERVICE_LINK = '[data-testid="agreement-terms-of-service-link"]';
  private AGREEMENT_PRIVACY_POLICY_LINK = '[data-testid="agreement-privacy-policy-link"]';

  get logo(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.LOGO_IMAGE);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TITLE);
  }

  get subtitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SUBTITLE);
  }

  get createWalletIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CREATE_WALLET_ICON);
  }

  get createWalletTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CREATE_WALLET_TITLE);
  }

  get createWalletDescription(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CREATE_WALLET_DESCRIPTION);
  }

  get createWalletButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CREATE_WALLET_BUTTON);
  }

  get hardwareWalletIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.HARDWARE_WALLET_ICON);
  }

  get hardwareWalletTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.HARDWARE_WALLET_TITLE);
  }

  get hardwareWalletDescription(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.HARDWARE_WALLET_DESCRIPTION);
  }

  get hardwareWalletButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.HARDWARE_WALLET_BUTTON);
  }

  get restoreWalletIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.RESTORE_WALLET_ICON);
  }

  get restoreWalletTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.RESTORE_WALLET_TITLE);
  }

  get restoreWalletDescription(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.RESTORE_WALLET_DESCRIPTION);
  }

  get restoreWalletButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.RESTORE_WALLET_BUTTON);
  }

  get agreementText(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.AGREEMENT_TEXT);
  }

  get agreementTermsOfServiceLink(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.AGREEMENT_TERMS_OF_SERVICE_LINK);
  }

  get agreementPrivacyPolicyLink(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.AGREEMENT_PRIVACY_POLICY_LINK);
  }

  async clickOnLegalLink(linkText: string): Promise<void> {
    switch (linkText) {
      case 'Privacy policy':
        await this.agreementPrivacyPolicyLink.click();
        break;
      case 'Terms of service':
        await this.agreementTermsOfServiceLink.click();
        break;
      default:
        throw new Error(`Unsupported legal link text - ${linkText}`);
    }
  }

  async restoreWallet(): Promise<void> {
    await this.restoreWalletButton.click();
    await recoveryPhrasePage.enterMnemonicWords(getTestWallet(TestWalletName.TestAutomationWallet).mnemonic ?? []);
    await recoveryPhrasePage.nextButton.click();
    await walletSetupPage.setWalletNameInput('ValidName');
    await walletSetupPage.setWalletPasswordInput('N_8J@bne87A');
    await walletSetupPage.setWalletPasswordConfirmInput('N_8J@bne87A');
    await walletSetupPage.clickEnterWalletButton();
    await topNavigationAssert.assertLogoPresent();
  }
}

export default new OnboardingMainPage();
