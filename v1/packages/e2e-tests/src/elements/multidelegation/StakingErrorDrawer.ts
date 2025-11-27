/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class StakingErrorDrawer {
  private ICON = '[data-testid="result-message-img"]';
  private TITLE = '[data-testid="result-message-title"]';
  private DESCRIPTION = '[data-testid="result-message-description"]';
  private RETRY_BUTTON = '[data-testid="staking-fail-retry-button"]';
  private CLOSE_BUTTON = '[data-testid="staking-fail-close-button"]';

  get icon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ICON);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TITLE);
  }

  get description(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DESCRIPTION);
  }

  get retryButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.RETRY_BUTTON);
  }

  get closeButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CLOSE_BUTTON);
  }
}

export default new StakingErrorDrawer();
