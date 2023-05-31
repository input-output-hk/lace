/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class AuthorizeDAppModal {
  private CONTAINER = '[data-testid="connect-modal-container"]';
  private TITLE = '[data-testid="connect-modal-title"]';
  private DESCRIPTION = '[data-testid="connect-modal-description"]';
  private ALWAYS_BUTTON = '[data-testid="connect-modal-accept-always"]';
  private ONCE_BUTTON = '[data-testid="connect-modal-accept-once"]';

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TITLE);
  }

  get description(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DESCRIPTION);
  }

  get alwaysButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ALWAYS_BUTTON);
  }

  get onceButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ONCE_BUTTON);
  }
}

export default new AuthorizeDAppModal();
