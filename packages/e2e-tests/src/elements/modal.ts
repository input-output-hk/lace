/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class Modal {
  private CONTAINER = '.ant-modal-content';
  private TITLE = '[data-testid="delete-address-modal-title"]';
  private DESCRIPTION = '[data-testid="delete-address-modal-description"]';
  private CANCEL_BUTTON = '[data-testid="delete-address-modal-cancel"]';
  private CONFIRM_BUTTON = '[data-testid="delete-address-modal-confirm"]';

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TITLE);
  }

  get description(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DESCRIPTION);
  }

  get cancelButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CANCEL_BUTTON);
  }

  get confirmButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONFIRM_BUTTON);
  }

  buttonWithText(value: string): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER).$(`//button/span[text() = '${value}']`);
  }
}

export default new Modal();
