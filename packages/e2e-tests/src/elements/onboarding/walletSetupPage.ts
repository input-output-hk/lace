import CommonOnboardingElements from './commonOnboardingElements';
import { setInputFieldValue } from '../../utils/inputFieldUtils';
import recoveryPhrasePage from './recoveryPhrasePage';
import onboardingWalletSetupPageAssert from '../../assert/onboarding/onboardingWalletSetupPageAssert';

class WalletSetupPage extends CommonOnboardingElements {
  private SUBTITLE = '[data-testid="wallet-setup-step-subtitle"]';
  private WALLET_NAME_INPUT = '[data-testid="wallet-name-input"]';
  private WALLET_NAME_ERROR = '[data-testid="wallet-name-input-error"]';
  private PASSWORD_INPUT = 'input[data-testid="wallet-password-verification-input"]';
  private PASSWORD_CONFIRM_INPUT = 'input[data-testid="wallet-password-confirmation-input"]';
  private PASSWORD_CONFIRM_ERROR = '[data-testid="wallet-password-confirmation-input-error"]';
  private COMPLEXITY_BARS_ACTIVE = '[data-testid="bar-level-active"]';
  private PASSWORD_FEEDBACK = '[data-testid="password-feedback"]';
  private ENTER_WALLET_BUTTON = '[data-testid="wallet-setup-step-btn-next"]';

  get subtitle() {
    return $(this.SUBTITLE);
  }

  get walletNameInput() {
    return $(this.WALLET_NAME_INPUT);
  }

  get walletNameError() {
    return $(this.WALLET_NAME_ERROR);
  }

  get walletPasswordInput() {
    return $(this.PASSWORD_INPUT);
  }

  get walletPasswordConfirmInput() {
    return $(this.PASSWORD_CONFIRM_INPUT);
  }

  get activeComplexityBars() {
    return $$(this.COMPLEXITY_BARS_ACTIVE);
  }

  get walletPasswordConfirmError() {
    return $(this.PASSWORD_CONFIRM_ERROR);
  }

  get passwordFeedback() {
    return $(this.PASSWORD_FEEDBACK);
  }

  get enterWalletButton() {
    return $(this.ENTER_WALLET_BUTTON);
  }

  async setWalletNameInput(value: string): Promise<void> {
    await setInputFieldValue(await this.walletNameInput, value);
  }

  async setWalletPasswordInput(value: string): Promise<void> {
    await setInputFieldValue(await this.walletPasswordInput, value);
  }

  async setWalletPasswordConfirmInput(value: string): Promise<void> {
    await setInputFieldValue(await this.walletPasswordConfirmInput, value);
  }

  async clickEnterWalletButton(): Promise<void> {
    await onboardingWalletSetupPageAssert.assertEnterWalletButtonIsEnabled();
    await this.nextButton.click();
  }

  getNumberOfActiveComplexityBars(): Promise<number> {
    return this.activeComplexityBars.length;
  }
  async goToWalletSetupPage(
    flowType: 'Create' | 'Restore',
    mnemonicWords: string[] = [],
    fillValues = true
  ): Promise<void> {
    await recoveryPhrasePage.goToMnemonicVerificationPage(flowType, mnemonicWords);
    await recoveryPhrasePage.nextButton.click();
    if (fillValues) {
      await this.setWalletNameInput('TestAutomationWallet');
      await this.setWalletPasswordInput('N_8J@bne87A');
      await this.setWalletPasswordConfirmInput('N_8J@bne87A');
    }
  }
}

export default new WalletSetupPage();
