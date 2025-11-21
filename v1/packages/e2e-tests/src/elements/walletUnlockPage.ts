/* global WebdriverIO */
import PasswordInput from './passwordInput';
import type { ChainablePromiseElement } from 'webdriverio';

class WalletUnlockPage {
  private MAIN_IMG = '[data-testid="unlock-screen-img"]';
  private TITLE = '[data-testid="unlock-screen-title"]';
  private UNLOCK_BUTTON = '[data-testid="unlock-button"]';
  private FORGOT_PASSWORD_LINK = '[data-testid="forgot-password-link"]';
  private HELP_AND_SUPPORT_BUTTON = '[data-testid="lock-screen-help-button"]';

  get mainImage(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MAIN_IMG);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TITLE);
  }

  get passwordInput() {
    return PasswordInput.input;
  }

  get unlockButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.UNLOCK_BUTTON);
  }

  get forgotPassword(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.FORGOT_PASSWORD_LINK);
  }

  get helpAndSupportButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.HELP_AND_SUPPORT_BUTTON);
  }
}

export default new WalletUnlockPage();
