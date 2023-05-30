/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class AddressPage {
  private TITLE_SELECTOR = '//h1';
  private COUNTER_SELECTOR = '[data-testid="counter"]';

  get titleElement(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TITLE_SELECTOR);
  }

  get counterElement(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COUNTER_SELECTOR);
  }

  async getTitle(): Promise<string> {
    return await this.titleElement.getText();
  }

  async getCounter(): Promise<string> {
    const counterText = await this.counterElement.getText();
    return counterText.slice(1, -1);
  }
}

export default new AddressPage();
