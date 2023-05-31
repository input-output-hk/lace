import { LocatorStrategy } from '../actor/webTester';

export abstract class WebElement implements IWebElement {
  toJSLocator(): string {
    throw new Error('method not implemented');
  }

  // eslint-disable-next-line no-undef
  async interact(): Promise<ReturnType<WebdriverIO.Browser['$']>> {
    return $(this.toJSLocator());
  }

  locatorStrategy(): LocatorStrategy {
    return 'css selector';
  }
}

const DummyElement = class extends WebElement {
  protected selector: string;
  protected strategy: LocatorStrategy;

  constructor(selector: string, strategy: LocatorStrategy) {
    super();
    this.selector = selector;
    this.strategy = strategy;
  }

  toJSLocator(): string {
    return this.selector;
  }

  locatorStrategy(): LocatorStrategy {
    return this.strategy;
  }
};

interface IWebElement {
  toJSLocator(): string;

  // eslint-disable-next-line no-undef
  interact(): Promise<ReturnType<WebdriverIO.Browser['$']>>;

  locatorStrategy(): LocatorStrategy;
}

export const WebElementFactory = {
  fromSelector: (selector: string, strategy: LocatorStrategy): WebElement => new DummyElement(selector, strategy)
};
