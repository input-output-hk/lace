import { WebElement, WebElementFactory as Factory } from '../webElement';
import { LocatorStrategy } from '../../actor/webTester';

export class TransactionErrorPage extends WebElement {
  private CONTAINER = '//div[@class="ant-drawer-body"]';
  private MAIN_TITLE_SELECTOR = '//div[@data-testid="send-error-title"]';
  private SUBTITLE_SELECTOR = '//div[@data-testid="send-error-description"]';
  private SUBTITLE_2_SELECTOR = '//div[@data-testid="send-error-description2"]';

  constructor() {
    super();
  }

  mainTitle(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.MAIN_TITLE_SELECTOR}`, 'xpath');
  }

  subTitle(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.SUBTITLE_SELECTOR}`, 'xpath');
  }

  subTitle2(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.SUBTITLE_2_SELECTOR}`, 'xpath');
  }

  toJSLocator(): string {
    return this.CONTAINER;
  }

  locatorStrategy(): LocatorStrategy {
    return 'xpath';
  }
}
