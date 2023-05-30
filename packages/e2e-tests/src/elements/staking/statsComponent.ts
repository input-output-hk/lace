import webTester, { LocatorStrategy } from '../../actor/webTester';
import { WebElement, WebElementFactory as Factory } from './../webElement';

export class StatsComponent extends WebElement {
  protected CONTAINER;
  private TITLE = '//div[@data-testid="stats-title"]';
  private VALUE = '//div[@data-testid="stats-value"]';

  constructor(containerSelector: string) {
    super();
    this.CONTAINER = containerSelector;
  }

  container(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}`, 'xpath');
  }

  title(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TITLE}`, 'xpath');
  }

  value(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.VALUE}`, 'xpath');
  }

  async getTitle(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.title());
  }

  async getValue(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.value());
  }

  locatorStrategy(): LocatorStrategy {
    return 'xpath';
  }
}
