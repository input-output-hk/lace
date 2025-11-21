/* eslint-disable no-undef */
import CommonDrawerElements from '../CommonDrawerElements';
import type { ChainablePromiseElement } from 'webdriverio';

class MessageSigningConfirmationDrawer extends CommonDrawerElements {
  private PASSWORD_INPUT = '[data-testid="password-input"]';
  private SIGN_MESSAGE_BUTTON = '[data-testid="sign-message-button"]';
  private CLOSE_BUTTON = '[data-testid="close-button"]';

  get passwordInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PASSWORD_INPUT);
  }

  get signMessageButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SIGN_MESSAGE_BUTTON);
  }

  get closeButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CLOSE_BUTTON);
  }
}

export default new MessageSigningConfirmationDrawer();
