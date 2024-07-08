/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class PasswordInput {
  private CONTAINER = '[data-testid="password-input-container"]';
  private INPUT = '[data-testid="password-input"]';
  private PASSWORD_SHOW_BUTTON = '[data-testid="password-input-show-icon"]';
  private PASSWORD_HIDE_BUTTON = '[data-testid="password-input-hide-icon"]';
  private ERROR = '[data-testid="password-input-error"]';

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER);
  }

  get input(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.container.$(this.INPUT);
  }

  get passwordShowButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.container.$(this.PASSWORD_SHOW_BUTTON);
  }

  get passwordHideButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.container.$(this.PASSWORD_HIDE_BUTTON);
  }

  get error(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.container.$(this.ERROR);
  }
}

export default new PasswordInput();
