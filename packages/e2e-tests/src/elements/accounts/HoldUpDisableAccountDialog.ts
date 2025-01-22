/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class HoldUpDisableAccountDialog {
  private BODY = '[role="alertdialog"]';
  private TITLE = '//h2[@data-testid="dialog-title"]';
  private DESCRIPTION = `${this.TITLE}/following-sibling::span`;
  private CANCEL_BUTTON = '[data-testid="dialog-action-cancel"]';
  private CONFIRM_BUTTON = '[data-testid="dialog-action-confirm"]';

  get body(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.BODY);
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

  async clickCancelButton() {
    await this.cancelButton.waitForClickable();
    await this.cancelButton.click();
  }

  async clickConfirmButton() {
    await this.confirmButton.waitForClickable();
    await this.confirmButton.click();
  }
}

export default new HoldUpDisableAccountDialog();
