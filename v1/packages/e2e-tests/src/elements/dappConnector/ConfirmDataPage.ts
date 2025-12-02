/* global WebdriverIO */
import CommonDappPageElements from './commonDappPageElements';
import type { ChainablePromiseElement } from 'webdriverio';

class ConfirmDataPage extends CommonDappPageElements {
  private ADDRESS_TITLE = '[data-testid="dapp-transaction-recipient-address-title"]';
  private ADDRESS_VALUE = '[data-testid="dapp-transaction-recipient-address"]';
  private DATA_TITLE = '[data-testid="dapp-transaction-data-title"]';
  private DATA_VALUE = '[data-testid="dapp-transaction-data"]';
  private CONFIRM_BUTTON = '[data-testid="dapp-transaction-confirm"]';
  private CANCEL_BUTTON = '[data-testid="dapp-transaction-cancel"]';

  get addressTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ADDRESS_TITLE);
  }

  get addressValue(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ADDRESS_VALUE);
  }

  get dataTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DATA_TITLE);
  }

  get dataValue(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DATA_VALUE);
  }

  get confirmButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONFIRM_BUTTON);
  }

  get cancelButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CANCEL_BUTTON);
  }

  async clickConfirmButton(): Promise<void> {
    await this.confirmButton.waitForClickable();
    await this.confirmButton.click();
  }

  async clickCancelButton(): Promise<void> {
    await this.cancelButton.waitForClickable();
    await this.cancelButton.click();
  }
}

export default new ConfirmDataPage();
