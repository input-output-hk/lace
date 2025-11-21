/* global WebdriverIO */
import type { ChainablePromiseElement } from 'webdriverio';

class ErrorDAppModal {
  private IMAGE = '[data-testid="dapp-sign-tx-fail-image"]';
  private HEADING = '[data-testid="dapp-sign-tx-fail-heading"]';
  private DESCRIPTION = '[data-testid="dapp-sign-tx-fail-description"]';
  private CLOSE_BUTTON = '[data-testid="dapp-sign-tx-fail-close-button"]';

  get image(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.IMAGE);
  }

  get heading(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.HEADING);
  }

  get description(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DESCRIPTION);
  }

  get closeButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CLOSE_BUTTON);
  }
}

export default new ErrorDAppModal();
