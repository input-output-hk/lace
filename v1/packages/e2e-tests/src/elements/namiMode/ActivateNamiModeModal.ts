/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class ActivateNamiModeModal {
  private CONTAINER = '(//div[@class="ant-modal-wrap ant-modal-centered" and not(@style="display: none;")])[last()]';
  private TITLE = '//div[@data-testid="delete-address-modal-title"]';
  private DESCRIPTION = '//div[@data-testid="delete-address-modal-description"]';
  private CANCEL_BUTTON = '//button[@data-testid="delete-address-modal-cancel"]';
  private CONFIRM_BUTTON = '//button[@data-testid="delete-address-modal-confirm"]';

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
}

export default new ActivateNamiModeModal();
