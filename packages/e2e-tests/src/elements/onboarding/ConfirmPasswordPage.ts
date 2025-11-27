/* eslint-disable no-undef */
import CommonOnboardingElements from './commonOnboardingElements';
import type { ChainablePromiseElement } from 'webdriverio';
import { setInputFieldValue } from '../../utils/inputFieldUtils';

class ConfirmPasswordPage extends CommonOnboardingElements {
  private PASSWORD_INPUT = 'input[type="password"]';
  private PASSWORD_ERROR = '[data-testid="wallet-setup-step-content"] form span';

  get passwordInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PASSWORD_INPUT);
  }

  get passwordError(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PASSWORD_ERROR);
  }

  async setPasswordInput(value: string): Promise<void> {
    await setInputFieldValue(await this.passwordInput, value);
  }

  async clickConfirmButton(): Promise<void> {
    await this.nextButton.waitForClickable();
    await this.nextButton.click();
  }
}

export default new ConfirmPasswordPage();
