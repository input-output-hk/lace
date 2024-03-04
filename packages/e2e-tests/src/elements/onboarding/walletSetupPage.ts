/* eslint-disable no-undef */
import CommonOnboardingElements from './commonOnboardingElements';
import { ChainablePromiseElement } from 'webdriverio';

class WalletSetupPage extends CommonOnboardingElements {
  private SUBTITLE = '[data-testid="wallet-setup-step-subtitle"]';
  private WALLET_NAME_INPUT = '[data-testid="wallet-name-input"]';
  private WALLET_NAME_ERROR = '[data-testid="wallet-name-input-error"]';
  private PASSWORD_INPUT = 'input[data-testid="wallet-password-verification-input"]';
  private PASSWORD_CONFIRM_INPUT = 'input[data-testid="wallet-password-confirmation-input"]';
  private PASSWORD_CONFIRM_ERROR = '[data-testid="wallet-password-confirmation-input-error"]';
  private COMPLEXITY_BARS_ACTIVE = '[data-testid="bar-level-active"]';

  get subtitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SUBTITLE);
  }

  get walletNameInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.WALLET_NAME_INPUT);
  }

  get walletNameError(): ChainablePromiseElement<WebdriverIO.Element> {
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

  async setWalletNameInput(value: string): Promise<void> {
    await this.walletNameInput.setValue(value);
  }

  async setWalletPasswordInput(value: string): Promise<void> {
    await this.walletPasswordInput.setValue(value);
  }

  async setWalletPasswordConfirmInput(value: string): Promise<void> {
    await this.walletPasswordConfirmInput.setValue(value);
  }

  getNumberOfActiveComplexityBars(): Promise<number> {
    return this.activeComplexityBars.length;
  }
}

export default new WalletSetupPage();
