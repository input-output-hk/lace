import CommonOnboardingElements from './commonOnboardingElements';
import { setInputFieldValue } from '../../utils/inputFieldUtils';

class OnboardingWalletPasswordPage extends CommonOnboardingElements {
  private SUBTITLE = '[data-testid="wallet-setup-step-subtitle"]';
  private WALLET_NAME_INPUT = '[data-testid="wallet-name-input"]';
  private WALLET_NAME_ERROR = '[data-testid="wallet-name-input-error"]';
  private PASSWORD_INPUT = 'input[data-testid="wallet-password-verification-input"]';
  private PASSWORD_CONFIRM_INPUT = 'input[data-testid="wallet-password-confirmation-input"]';
  private PASSWORD_CONFIRM_ERROR = '[data-testid="wallet-password-confirmation-input-error"]';
  private COMPLEXITY_BARS_ACTIVE = '[data-testid="bar-level-active"]';
  private PASSWORD_FEEDBACK = '[data-testid="password-feedback"]';

  get subtitle() {
    return $(this.SUBTITLE);
  }

  get walletNameInput() {
    return $(this.WALLET_NAME_INPUT);
  }

  get walletNameError() {
    return $(this.WALLET_NAME_ERROR);
  }

  async setWalletNameInput(value: string): Promise<void> {
    await setInputFieldValue(await this.walletNameInput, value);
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

  getNumberOfActiveComplexityBars(): Promise<number> {
    return this.activeComplexityBars.length;
  }
}

export default new OnboardingWalletPasswordPage();
