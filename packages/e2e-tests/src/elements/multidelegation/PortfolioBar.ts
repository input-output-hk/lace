/* global WebdriverIO */
import type { ChainablePromiseElement } from 'webdriverio';

class PortfolioBar {
  private CONTAINER = '[data-testid="portfoliobar-container"]';
  private SELECTED_POOLS_COUNTER = '[data-testid="portfoliobar-selected-pools"]';
  private MAX_POOLS_COUNTER = '[data-testid="portfoliobar-max-pools"]';
  private NEXT_BUTTON = '[data-testid="portfoliobar-btn-next"]';
  private CLEAR_BUTTON = '[data-testid="portfoliobar-btn-clear"]';

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER);
  }

  get selectedPoolsCounter(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SELECTED_POOLS_COUNTER);
  }

  get maxPoolsCounter(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MAX_POOLS_COUNTER);
  }

  get nextButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NEXT_BUTTON);
  }

  get clearButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CLEAR_BUTTON);
  }

  async clickNextButton() {
    await this.nextButton.waitForClickable();
    await this.nextButton.click();
  }

  async clickClearButton() {
    await this.clearButton.waitForClickable();
    await this.clearButton.click();
  }
}

export default new PortfolioBar();
