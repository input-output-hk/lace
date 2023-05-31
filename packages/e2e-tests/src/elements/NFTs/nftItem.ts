import webTester, { LocatorStrategy } from '../../actor/webTester';
import { WebElement, WebElementFactory as Factory } from '../webElement';

export class NftItem extends WebElement {
  protected CONTAINER = '//a[@data-testid="nft-item"]';
  private IMAGE_SELECTOR = '//img[@data-testid="nft-image"]';
  private NAME_SELECTOR = '//p[@data-testid="nft-item-name"]';
  private AMOUNT_SELECTOR = '//div[@data-testid="nft-item-amount"]';

  constructor(item = '0') {
    super();

    // eslint-disable-next-line unicorn/prefer-number-properties
    if (isNaN(Number(item))) this.CONTAINER = `${this.CONTAINER}[.//p[contains(text(), '${item}')]]`;
    else if (Number(item) !== 0) this.CONTAINER = `${this.CONTAINER}[${item}]`;
  }

  container(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}`, 'xpath');
  }

  image(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.IMAGE_SELECTOR}`, 'xpath');
  }

  name(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.NAME_SELECTOR}`, 'xpath');
  }

  amount(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.AMOUNT_SELECTOR}`, 'xpath');
  }

  async getName(): Promise<number | string> {
    return await webTester.getTextValueFromElement(this.name());
  }

  async getAmount(): Promise<number> {
    return Number(await webTester.getTextValueFromElement(this.amount()));
  }

  toJSLocator(): string {
    return this.CONTAINER;
  }

  locatorStrategy(): LocatorStrategy {
    return 'xpath';
  }
}
