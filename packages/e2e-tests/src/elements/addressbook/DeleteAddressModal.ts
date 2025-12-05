/* global WebdriverIO */
import type { ChainablePromiseElement } from 'webdriverio';

class DeleteAddressModal {
  private CONTAINER = '.ant-modal-wrap:not([style="display: none;"]) .ant-modal-content';
  private TITLE = '[data-testid="delete-address-modal-title"]';
  private DESCRIPTION = '[data-testid="delete-address-modal-description"]';
  private CANCEL_BUTTON = '[data-testid="delete-address-modal-cancel"]';
  private DELETE_ADDRESS_BUTTON = '[data-testid="delete-address-modal-confirm"]';

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.container.$(this.TITLE);
  }

  get description(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.container.$(this.DESCRIPTION);
  }

  get cancelButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.container.$(this.CANCEL_BUTTON);
  }

  get deleteAddressButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.container.$(this.DELETE_ADDRESS_BUTTON);
  }
}

export default new DeleteAddressModal();
