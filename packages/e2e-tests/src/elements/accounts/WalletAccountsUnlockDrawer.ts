/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';
import CommonDrawerElements from '../CommonDrawerElements';

class WalletAccountsUnlockDrawer extends CommonDrawerElements {
  private HEADLINE = '[data-testid="enable-account-headline"]';
  private DESCRIPTION = '[data-testid="enable-account-description"]';
  private PASSWORD_FORM = '//div[@data-testid="enable-account-password-input"]';
  private PASSWORD_INPUT = `${this.PASSWORD_FORM}//form//input`;
  private PASSWORD_INPUT_PLACEHOLDER = `${this.PASSWORD_FORM}//label`;
  private PASSWORD_INPUT_BUTTON = `${this.PASSWORD_FORM}//form//button`;
  private ERROR = `${this.PASSWORD_FORM}//form//span`;
  private CONFIRM_BUTTON = '[data-testid="enable-account-password-prompt-confirm-btn"]';
  private CANCEL_BUTTON = '[data-testid="enable-account-password-prompt-cancel-btn"]';

  get headline(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.HEADLINE);
  }

  get description(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DESCRIPTION);
  }

  get passwordForm(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PASSWORD_FORM);
  }

  get passwordInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PASSWORD_INPUT);
  }

  get passwordInputPlaceholder(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PASSWORD_INPUT_PLACEHOLDER);
  }
  get passwordInputButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PASSWORD_INPUT_BUTTON);
  }

  get error(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ERROR);
  }

  get confirmButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONFIRM_BUTTON);
  }

  get cancelButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CANCEL_BUTTON);
  }

  async clickConfirmButton() {
    await this.confirmButton.waitForClickable();
    await this.confirmButton.click();
  }

  async clickCancelButton() {
    await this.cancelButton.waitForClickable();
    await this.cancelButton.click();
  }
}
export default new WalletAccountsUnlockDrawer();
