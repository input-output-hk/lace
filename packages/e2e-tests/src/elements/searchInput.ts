/* global WebdriverIO */
import type { ChainablePromiseElement } from 'webdriverio';

class SearchInput {
  private CONTAINER = '[data-testid="search-input-container"]';
  private INPUT = '[data-testid="search-input"]';
  private ICON = '[data-testid="search-icon"]';
  private CLEAR_BUTTON = '[data-testid="search-clear-button"]';

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER);
  }

  get input(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.INPUT);
  }

  get icon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ICON);
  }

  get clearButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CLEAR_BUTTON);
  }
}

export default new SearchInput();
