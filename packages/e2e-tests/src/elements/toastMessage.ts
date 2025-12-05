/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';
import { t } from '../utils/translationService';
import { Logger } from '../support/logger';

class ToastMessage {
  private CONTAINER = '[data-testid="toast-content-wrapper"]';
  private MESSAGE_TEXT = '[data-testid="toast-message-text"]';
  private ICON = '[data-testid="toast-icon"]';
  private CLOSE_BUTTON = '[data-testid="toast-close-btn"]';
  private PROGRESS_BAR = '[data-testid="progressbar-wrapper-id"]';

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER);
  }

  get messageText(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MESSAGE_TEXT);
  }

  get icon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ICON);
  }

  get closeButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CLOSE_BUTTON);
  }

  get progressBar(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PROGRESS_BAR);
  }

  async clickCloseButton() {
    await this.closeButton.waitForClickable();
    await this.closeButton.click();
  }

  async closeWalletSyncedToast(): Promise<void> {
    if (await this.container.isDisplayed()) {
      const toastMessage = await (await this.messageText).getText();
      if (toastMessage === (await t('addressesDiscovery.toast.successText')).toString()) {
        await this.clickCloseButton();
      } else {
        Logger.warn('Wallet synced toast is not displayed, you might want to remove this step');
      }
    }
  }
}

export default new ToastMessage();
