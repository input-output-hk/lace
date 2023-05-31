import { LocatorStrategy } from '../actor/webTester';
import { WebElement } from './webElement';

export class TextLink extends WebElement {
  protected value: string;

  constructor(value: string) {
    super();
    this.value = value;
  }

  toJSLocator(): string {
    return `//a[text() = '${this.value}']`;
  }

  locatorStrategy(): LocatorStrategy {
    return 'xpath';
  }
}
