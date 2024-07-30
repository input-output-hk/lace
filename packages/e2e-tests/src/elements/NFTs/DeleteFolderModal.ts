/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class DeleteFolderModal {
  private CONTAINER = '.ant-modal-wrap:not([style="display: none;"]) .ant-modal-content';
  private TITLE = '[data-testid="create-folder-modal-title"]';
  private DESCRIPTION = '[data-testid="create-folder-modal-description"]';
  private CANCEL_BUTTON = '[data-testid="delete-folder-modal-cancel"]';
  private CONFIRM_BUTTON = '[data-testid="delete-folder-modal-confirm"]';

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

  async clickCancelButton() {
    await this.cancelButton.waitForClickable();
    await this.cancelButton.click();
  }

  async clickConfirmButton() {
    await this.confirmButton.waitForClickable();
    await this.confirmButton.click();
  }
}

export default new DeleteFolderModal();
