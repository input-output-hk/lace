/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class Banner {
  private CONTAINER = '[data-testid="banner-container"]';
  private ICON = '[data-testid="banner-icon"]';
  private DESCRIPTION = '[data-testid="banner-description"]';

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER);
  }

  get icon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ICON);
  }

  get description(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DESCRIPTION);
  }

  async getContainerText(): Promise<string> {
    return this.description.getText();
  }
}

export default new Banner();
