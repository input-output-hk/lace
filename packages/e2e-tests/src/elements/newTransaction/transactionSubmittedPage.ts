/* eslint-disable no-undef */
import webTester, { LocatorStrategy } from '../../actor/webTester';
import { WebElement, WebElementFactory as Factory } from '../webElement';
import { ChainablePromiseElement } from 'webdriverio';

export class TransactionSubmittedPage extends WebElement {
  private CONTAINER = '//div[@class="ant-drawer-body"]';
  private IMAGE = '//img[@data-testid="result-message-img"]';
  private MAIN_TITLE = '//h4[@data-testid="result-message-title"]';
  private SUBTITLE = '//h5[@data-testid="result-message-description"]';
  private TX_HASH = '//div[@data-testid="transaction-hash"]';
  private VIEW_TRANSACTION_BUTTON = '#send-next-btn';

  constructor() {
    super();
  }

  image(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.IMAGE}`, 'xpath');
  }

  mainTitle(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.MAIN_TITLE}`, 'xpath');
  }

  subTitle(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.SUBTITLE}`, 'xpath');
  }

  txHash(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TX_HASH}`, 'xpath');
  }

  get viewTransactionButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.VIEW_TRANSACTION_BUTTON);
  }

  async getMainTitle(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.mainTitle());
  }

  async getSubTitle(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.subTitle());
  }

  async getTxHash(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.txHash());
  }

  toJSLocator(): string {
    return this.CONTAINER;
  }

  locatorStrategy(): LocatorStrategy {
    return 'xpath';
  }
}
