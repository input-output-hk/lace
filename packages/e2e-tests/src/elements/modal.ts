/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';
import { browser } from '@wdio/globals';

class Modal {
  private CONTAINER = '.ant-modal-wrap:not([style*="display: none;"]) .ant-modal-content';
  private TITLE = '[data-testid="delete-address-modal-title"]';
  private DESCRIPTION = '[data-testid="delete-address-modal-description"]';
  private CANCEL_BUTTON = '[data-testid="delete-address-modal-cancel"]';
  private CONFIRM_BUTTON = '[data-testid="delete-address-modal-confirm"]';

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER} ${this.TITLE}`);
  }

  get description(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER} ${this.DESCRIPTION}`);
  }

  get cancelButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER} ${this.CANCEL_BUTTON}`);
  }

  get confirmButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER} ${this.CONFIRM_BUTTON}`);
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

  async waitUntilModalDisappears() {
    await browser.pause(500);
    await browser.waitUntil(async () => !(await this.container.isDisplayed()), {
      timeout: 10_000,
      interval: 500,
      timeoutMsg: 'failed while waiting for the modal to disappear'
    });
  }
}

export default new Modal();
