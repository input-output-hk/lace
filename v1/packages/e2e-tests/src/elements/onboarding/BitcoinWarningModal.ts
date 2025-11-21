/* global WebdriverIO */
import { ChainablePromiseElement } from 'webdriverio';

class BitcoinWarningModal {
  private MODAL_CONTAINER = '[role="alertdialog"]';
  private MODAL_TITLE = '[data-testid="dialog-title"]';
  private MODAL_DESCRIPTION = '[data-testid="dialog-description"]';
  private CANCEL_BUTTON = '[data-testid="cancel-button"]';
  private UNDERSTOOD_BUTTON = '[data-testid="confirm-button"]';

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MODAL_CONTAINER);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MODAL_TITLE);
  }

  get description(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MODAL_DESCRIPTION);
  }

  get cancelButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CANCEL_BUTTON);
  }

  get understoodButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.UNDERSTOOD_BUTTON);
  }

  async clickCancelButton(): Promise<void> {
    await this.cancelButton.waitForClickable();
    await this.cancelButton.click();
  }

  async clickUnderstoodButton(): Promise<void> {
    await this.understoodButton.waitForClickable();
    await this.understoodButton.click();
  }
}

export default new BitcoinWarningModal();
