/* global WebdriverIO */
import { ChainablePromiseElement } from 'webdriverio';

class PasswordAuthPrompt {
  private readonly PASSWORD_INPUT = '[data-testid="authentication-prompt-input"]';
  private readonly CONFIRM_BUTTON = '[data-testid="authentication-prompt-button-confirm"]';

  get passwordInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PASSWORD_INPUT);
  }

  get confirmButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONFIRM_BUTTON);
  }

  async enterPasswordAndConfirm(password: string) {
    await this.passwordInput.waitForDisplayed();
    await this.passwordInput.setValue(password);
    await this.confirmButton.click();
  }
}

export default new PasswordAuthPrompt();
