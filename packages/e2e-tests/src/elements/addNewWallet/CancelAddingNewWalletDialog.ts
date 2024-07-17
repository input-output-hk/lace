/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class CancelAddingNewWalletDialog {
  private BODY = '[role="alertdialog"]';
  private TITLE = '[data-testid="dialog-title"]';
  private DESCRIPTION = '[data-testid="dialog-description"]';
  private GO_BACK_BUTTON = '[data-testid="cancel-button"]';
  private PROCEED_BUTTON = '[data-testid="confirm-button"]';

  get body(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.BODY);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TITLE);
  }

  get description(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DESCRIPTION);
  }

  get goBackButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.GO_BACK_BUTTON);
  }

  get proceedButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PROCEED_BUTTON);
  }

  async clickGoBackButton(): Promise<void> {
    await this.goBackButton.waitForClickable();
    await this.goBackButton.click();
  }

  async clickProceedButton(): Promise<void> {
    await this.proceedButton.waitForClickable();
    await this.proceedButton.click();
  }
}

export default new CancelAddingNewWalletDialog();
