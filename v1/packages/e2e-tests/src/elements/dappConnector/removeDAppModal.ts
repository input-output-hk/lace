/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class RemoveDAppModal {
  private CONTAINER = '.ant-modal-body';
  private TITLE = '[data-testid="delete-dapp-modal-title"]';
  private DESCRIPTION = '[data-testid="delete-dapp-modal-description"]';
  private CONFIRM_BUTTON = '[data-testid="delete-dapp-modal-confirm"]';
  private CANCEL_BUTTON = '[data-testid="delete-dapp-modal-cancel"]';

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TITLE);
  }

  get description(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DESCRIPTION);
  }

  get confirmButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONFIRM_BUTTON);
  }

  get cancelButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CANCEL_BUTTON);
  }

  async clickButton(button: 'Back' | 'Disconnect DApp'): Promise<void> {
    await this.cancelButton.waitForClickable();
    button === 'Back' ? await this.cancelButton.click() : await this.confirmButton.click();
  }
}

export default new RemoveDAppModal();
