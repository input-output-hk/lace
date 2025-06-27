/* global WebdriverIO */
import CommonDrawerElements from '../CommonDrawerElements';
import type { ChainablePromiseElement } from 'webdriverio';

class StakingSuccessDrawer extends CommonDrawerElements {
  private RESULT_ICON = '[data-testid="result-message-img"]';
  private RESULT_TITLE = '[data-testid="result-message-title"]';
  private RESULT_SUBTITLE = '[data-testid="result-message-description"]';
  private CLOSE_BUTTON = "[data-testid='transaction-success-footer-close-button']";

  get resultIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.RESULT_ICON);
  }

  get resultTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.RESULT_TITLE);
  }

  get resultSubtitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.RESULT_SUBTITLE);
  }

  get closeButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CLOSE_BUTTON);
  }

  async clickCloseButton() {
    await this.closeButton.waitForClickable();
    await this.closeButton.click();
  }
}

export default new StakingSuccessDrawer();
