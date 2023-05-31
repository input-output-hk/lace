/* eslint-disable no-undef */
import CommonOnboardingElements from './commonOnboardingElements';
import { ChainablePromiseElement } from 'webdriverio';

class OnboardingWalletNamePage extends CommonOnboardingElements {
  private SUBTITLE = '[data-testid="wallet-setup-step-subtitle"]';
  private WALLET_NAME_INPUT = '[data-testid="wallet-setup-register-name-input"]';
  private WALLET_NAME_ERROR = '[data-testid="wallet-setup-register-name-error"]';

  get subtitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SUBTITLE);
  }

  get walletNameInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.WALLET_NAME_INPUT);
  }

  get walletNameError(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.WALLET_NAME_ERROR);
  }

  async setWalletNameInput(value: string): Promise<void> {
    await this.walletNameInput.setValue(value);
  }
}

export default new OnboardingWalletNamePage();
