import { LocatorStrategy } from '../actor/webTester';
import { WebElement } from './webElement';

export class Button extends WebElement {
  protected value: string;

  constructor(value: string) {
    super();
    this.value = value;
  }

  toJSLocator(): string {
    return `//button[descendant::text() = '${this.value}']`;
  }

  locatorStrategy(): LocatorStrategy {
    return 'xpath';
  }
}
