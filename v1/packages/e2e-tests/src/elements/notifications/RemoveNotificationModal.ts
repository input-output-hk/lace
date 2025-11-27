/* global WebdriverIO */
import type { ChainablePromiseElement } from 'webdriverio';

class RemoveNotificationModal {
  private readonly MODAL_TITLE = '[data-testid="delete-address-modal-title"]';
  private readonly MODAL_DESCRIPTION = '[data-testid="delete-address-modal-description"]';
  private readonly CANCEL_BUTTON = '[data-testid="delete-address-modal-cancel"]';
  private readonly CONFIRM_BUTTON = '[data-testid="delete-address-modal-confirm"]';

  get modalTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MODAL_TITLE);
  }

  get modalDescription(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MODAL_DESCRIPTION);
  }

  get cancelButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CANCEL_BUTTON);
  }

  get confirmButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONFIRM_BUTTON);
  }

  async clickCancel(): Promise<void> {
    await this.cancelButton.waitForClickable();
    await this.cancelButton.click();
  }

  async clickConfirm(): Promise<void> {
    await this.confirmButton.waitForClickable();
    await this.confirmButton.click();
  }

  async getTitle(): Promise<string> {
    return await this.modalTitle.getText();
  }

  async getDescription(): Promise<string> {
    return await this.modalDescription.getText();
  }
}

export default new RemoveNotificationModal();
