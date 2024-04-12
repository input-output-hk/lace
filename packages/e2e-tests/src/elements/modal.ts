/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class Modal {
  private CONTAINER = '.ant-modal-wrap:not([style="display: none;"]) .ant-modal-content';
  private TITLE = '[data-testid="delete-address-modal-title"]';
  private DESCRIPTION = '[data-testid="delete-address-modal-description"]';
  private CANCEL_BUTTON = '[data-testid="delete-address-modal-cancel"]';
  private CONFIRM_BUTTON = '[data-testid="delete-address-modal-confirm"]';

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

  get confirmButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.container.$(this.CONFIRM_BUTTON);
  }

  buttonWithText(value: string): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER).$(`//button/span[text() = '${value}']`);
  }

  async clickCancelButton() {
    await this.cancelButton.waitForClickable();
    await this.cancelButton.click();
  }

  async clickConfirmButton() {
    await this.confirmButton.waitForStable();
    await this.confirmButton.waitForClickable();
    await this.confirmButton.click();
  }
}

export default new Modal();
