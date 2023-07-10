/* eslint-disable no-undef */
import { LocatorStrategy } from '../actor/webTester';
import { WebElement, WebElementFactory as Factory } from './webElement';

export class AddressInput extends WebElement {
  protected CONTAINER = '//div[@data-testid="address-input"]';
  private SEARCH_INPUT = '//input[@data-testid="search-input"]';
  private SEARCH_LABEL = '//div[@data-testid="input-label"]';
  private CTA_BUTTON = '//button[@data-testid="address-book-btn"]';

  constructor(index?: number) {
    super();
    this.CONTAINER =
      typeof index === 'undefined' || index.toString() === '' ? this.CONTAINER : `(${this.CONTAINER})[${index}]`;
  }

  container(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}`, 'xpath');
  }

  input(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.SEARCH_INPUT}`, 'xpath');
  }

  label(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.SEARCH_LABEL}`, 'xpath');
  }

  ctaButton(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.CTA_BUTTON}`, 'xpath');
  }

  toJSLocator(): string {
    return this.CONTAINER;
  }

  locatorStrategy(): LocatorStrategy {
    return 'xpath';
  }
}
