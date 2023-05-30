/* eslint-disable no-undef */

import { LocatorStrategy } from '../../actor/webTester';
import { WebElement, WebElementFactory as Factory } from '../webElement';

export class NftList extends WebElement {
  private CONTAINER = '//div[@data-testid="nft-list"]';
  private ITEM_SELECTOR = '//a[@data-testid="nft-item"]';

  constructor() {
    super();
  }

  container(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}`, 'xpath');
  }

  async items(): Promise<WebdriverIO.ElementArray> {
    return $$(`${this.ITEM_SELECTOR}`);
  }

  async getItemsCount(): Promise<number> {
    const items = await this.items();
    return items.length;
  }

  toJSLocator(): string {
    return this.CONTAINER;
  }

  locatorStrategy(): LocatorStrategy {
    return 'xpath';
  }
}
