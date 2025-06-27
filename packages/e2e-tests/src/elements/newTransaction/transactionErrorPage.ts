/* global WebdriverIO */
import CommonDrawerElements from '../CommonDrawerElements';
import type { ChainablePromiseElement } from 'webdriverio';

class TransactionErrorPage extends CommonDrawerElements {
  private MAIN_TITLE_SELECTOR = '[data-testid="send-error-title"]';
  private ERROR_DESCRIPTION_1 = '[data-testid="send-error-description"]';
  private ERROR_DESCRIPTION_2 = '[data-testid="send-error-description2"]';
  private ERROR_CANCEL_BUTTON = '[data-testid="send-cancel-btn"]';
  private ERROR_BACK_BUTTON = '[data-testid="send-next-btn"]';
  private ERROR_IMAGE = '[data-testid="result-message-img"]';

  get image(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ERROR_IMAGE);
  }

  get mainTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MAIN_TITLE_SELECTOR);
  }

  get descriptionLine1(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ERROR_DESCRIPTION_1);
  }

  get descriptionLine2(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ERROR_DESCRIPTION_2);
  }

  get cancelButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ERROR_CANCEL_BUTTON);
  }

  get backButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ERROR_BACK_BUTTON);
  }
}

export default new TransactionErrorPage();
