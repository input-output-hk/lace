import { TestWalletName, getTestWallet } from '../../support/walletConfiguration';
import CommonOnboardingElements from './commonOnboardingElements';
import recoveryPhrasePage from './recoveryPhrasePage';
import walletSetupPage from './walletSetupPage';
import topNavigationAssert from '../../assert/topNavigationAssert';

class OnboardingMainPage extends CommonOnboardingElements {
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

  get logo() {
    return $(this.LOGO_IMAGE);
  }

  get title() {
    return $(this.TITLE);
  }

  get subtitle() {
    return $(this.SUBTITLE);
  }

  get createWalletIcon() {
    return $(this.CREATE_WALLET_ICON);
  }

  get createWalletTitle() {
    return $(this.CREATE_WALLET_TITLE);
  }

  get createWalletDescription() {
    return $(this.CREATE_WALLET_DESCRIPTION);
  }

  get createWalletButton() {
    return $(this.CREATE_WALLET_BUTTON);
  }

  get hardwareWalletIcon() {
    return $(this.HARDWARE_WALLET_ICON);
  }

  get hardwareWalletTitle() {
    return $(this.HARDWARE_WALLET_TITLE);
  }

  get hardwareWalletDescription() {
    return $(this.HARDWARE_WALLET_DESCRIPTION);
  }

  get hardwareWalletButton() {
    return $(this.HARDWARE_WALLET_BUTTON);
  }

  get restoreWalletIcon() {
    return $(this.RESTORE_WALLET_ICON);
  }

  get restoreWalletTitle() {
    return $(this.RESTORE_WALLET_TITLE);
  }

  get restoreWalletDescription() {
    return $(this.RESTORE_WALLET_DESCRIPTION);
  }

  get restoreWalletButton() {
    return $(this.RESTORE_WALLET_BUTTON);
  }

  get agreementText() {
    return $(this.AGREEMENT_TEXT);
  }

  get agreementTermsOfServiceLink() {
    return $(this.AGREEMENT_TERMS_OF_SERVICE_LINK);
  }

  get agreementPrivacyPolicyLink() {
    return $(this.AGREEMENT_PRIVACY_POLICY_LINK);
  }

  async clickOnLegalLink(link: string, isMainPage = false): Promise<void> {
    switch (link) {
      case 'Cookie policy':
        await this.cookiePolicyLink.click();
        break;
      case 'Privacy policy':
        isMainPage ? await this.agreementPrivacyPolicyLink.click() : await this.privacyPolicyLink.click();
        break;
      case 'Terms of service':
        isMainPage ? await this.agreementTermsOfServiceLink.click() : await this.termsOfServiceLink.click();
        break;
      default:
        throw new Error(`Unsupported legal link - ${link}`);
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
