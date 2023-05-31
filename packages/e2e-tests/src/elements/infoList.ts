import { LocatorStrategy } from '../actor/webTester';
import { WebElement, WebElementFactory as Factory } from './webElement';

export class InfoList extends WebElement {
  protected CONTAINER = '//div[@data-testid="info-list"]';
  private LIST_ITEM = '//div[@data-testid="info-list-item"]';
  private LIST_ITEM_KEY = '//p[@data-testid="info-list-item-key"]';
  private LIST_ITEM_VALUE = '//h5[@data-testid="info-list-item-value"]';

  constructor(parentContainer = '') {
    super();
    if (parentContainer !== '') this.CONTAINER = `${parentContainer}${this.CONTAINER}`;
  }

  container(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}`, 'xpath');
  }

  listItem(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.LIST_ITEM}`, 'xpath');
  }

  listItemKey(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.LIST_ITEM_KEY}`, 'xpath');
  }

  listItemValue(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.LIST_ITEM_VALUE}`, 'xpath');
  }

  toJSLocator(): string {
    return this.CONTAINER;
  }

  locatorStrategy(): LocatorStrategy {
    return 'xpath';
  }
}
