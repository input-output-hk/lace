/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class NoWalletModal {
  private CONTAINER = '[data-testid="no-wallet-container"]';
  private IMAGE = '[data-testid="no-wallet-image"]';
  private TITLE = '[data-testid="no-wallet-heading"]';
  private DESCRIPTION = '[data-testid="no-wallet-description"]';
  private CREATE_RESTORE_BUTTON = '[data-testid="create-or-restore-wallet-btn"]';

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER);
  }

  get image(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.IMAGE);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TITLE);
  }

  get description(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DESCRIPTION);
  }

  get createRestoreButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CREATE_RESTORE_BUTTON);
  }

  async clickCreateRestoreButton(): Promise<void> {
    await this.createRestoreButton.waitForClickable();
    await this.createRestoreButton.click();
  }
}

export default new NoWalletModal();
