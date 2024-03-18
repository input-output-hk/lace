/* eslint-disable no-undef */
import webTester, { LocatorStrategy } from '../../actor/webTester';
import { WebElement, WebElementFactory as Factory } from '../webElement';
import { ChainablePromiseElement } from 'webdriverio';

export class TokenSearchResult extends WebElement {
  protected CONTAINER = '//div[@data-testid="coin-search-row"]';
  private TOKEN_SEARCH_INPUT = '//input[@data-testid="search-input"]';
  private ICON_SELECTOR = '//div[@data-testid="coin-search-row-icon"]';
  private TOKEN_NAME_SELECTOR = '//div[@data-testid="coin-search-row-info"]/h6';
  private TOKEN_TICKER_SELECTOR = '//div[@data-testid="coin-search-row-info"]/p';
  private TOKEN_BALANCE_SELECTOR = '//div[@data-testid="coin-search-row-amount"]/h6';
  private TOKEN_BALANCE_FIAT_SELECTOR = '//div[@data-testid="coin-search-row-amount"]/p';

  constructor(item = '0') {
    super();

    // eslint-disable-next-line unicorn/prefer-number-properties
    if (isNaN(Number(item)))
      this.CONTAINER = `//div[@data-testid="coin-search-row" and descendant::h6[text()="${item}"]]`;
    else if (Number(item) !== 0) this.CONTAINER = `${this.CONTAINER}[${item}]`;
  }

  container(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}`, 'xpath');
  }

  get searchInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TOKEN_SEARCH_INPUT);
  }

  iconElement(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.ICON_SELECTOR}`, 'xpath');
  }

  nameElement(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TOKEN_NAME_SELECTOR}`, 'xpath');
  }

  tickerElement(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TOKEN_TICKER_SELECTOR}`, 'xpath');
  }

  balanceElement(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TOKEN_BALANCE_SELECTOR}`, 'xpath');
  }

  balanceFiatElement(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TOKEN_BALANCE_FIAT_SELECTOR}`, 'xpath');
  }

  async getName(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.nameElement());
  }

  async getTicker(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.tickerElement());
  }

  async getBalance(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.balanceElement());
  }

  async getBalanceFiat(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.balanceFiatElement());
  }

  toJSLocator(): string {
    return this.CONTAINER;
  }

  locatorStrategy(): LocatorStrategy {
    return 'xpath';
  }
}
