/* eslint-disable no-undef */
import webTester, { LocatorStrategy } from '../actor/webTester';
import { WebElement, WebElementFactory as Factory } from './webElement';

export class TokenDetailsPage extends WebElement {
  private CONTAINER = '//div[@id="asset-drawer-body"]';
  private TOKEN_LOGO = '//div[@data-testid="asset-details-header"]/img';
  private TOKEN_NAME = '//div[@data-testid="asset-name"]/h1';
  private TOKEN_TICKER = '//div[@data-testid="asset-name"]/p';

  private TOKEN_PRICE_LABEL = '//div[@data-testid="asset-price"]//label';
  private TOKEN_PRICE_VALUE = '//div[@data-testid="asset-price"]//h1[@data-testid="portfolio-balance-value"]';
  private TOKEN_PRICE_CURRENCY = '//div[@data-testid="asset-price"]//h4[@data-testid="portfolio-balance-currency"]';
  private TOKEN_PRICE_CHANGE = '//div[@data-testid="asset-price"]/h4';

  private TOKEN_BALANCE_LABEL = '//div[@data-testid="asset-balance"]//label';
  private TOKEN_BALANCE_VALUE = '//div[@data-testid="asset-balance"]//h1[@data-testid="portfolio-balance-value"]';
  private TOKEN_BALANCE_CURRENCY = '//div[@data-testid="asset-balance"]//h4[@data-testid="portfolio-balance-currency"]';
  private TOKEN_BALANCE_TOTAL = '//div[@data-testid="asset-balance"]/h4';

  private TRANSACTIONS_LIST_TITLE = '//span[@data-testid="asset-activity-list-title"]';
  private TRANSACTION_ITEM = '//div[@data-testid="asset-activity-item"]';

  private SEE_ALL_TRANSACTIONS_BUTTON = '//button[@data-testid="see-all-your-transactions-button"]';

  constructor() {
    super();
  }

  tokenLogo(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TOKEN_LOGO}`, 'xpath');
  }

  tokenName(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TOKEN_NAME}`, 'xpath');
  }

  tokenTicker(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TOKEN_TICKER}`, 'xpath');
  }

  tokenPriceLabel(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TOKEN_PRICE_LABEL}`, 'xpath');
  }

  tokenPriceValue(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TOKEN_PRICE_VALUE}`, 'xpath');
  }

  tokenPriceCurrency(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TOKEN_PRICE_CURRENCY}`, 'xpath');
  }

  tokenPriceChange(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TOKEN_PRICE_CHANGE}`, 'xpath');
  }

  tokenBalanceLabel(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TOKEN_BALANCE_LABEL}`, 'xpath');
  }

  tokenBalanceValue(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TOKEN_BALANCE_VALUE}`, 'xpath');
  }

  tokenBalanceCurrency(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TOKEN_BALANCE_CURRENCY}`, 'xpath');
  }

  tokenBalanceTotal(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TOKEN_BALANCE_TOTAL}`, 'xpath');
  }

  transactionsListTitle(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TRANSACTIONS_LIST_TITLE}`, 'xpath');
  }

  async getTransactionsListItems(): Promise<WebdriverIO.ElementArray> {
    return $$(`${this.CONTAINER}${this.TRANSACTION_ITEM}`);
  }

  seeAllTransactionsButton(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.SEE_ALL_TRANSACTIONS_BUTTON}`, 'xpath');
  }

  async getTokenName(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.tokenName());
  }

  async getTokenTicker(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.tokenTicker());
  }

  async getTokenPriceLabel(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.tokenPriceLabel());
  }

  async getTokenPriceValue(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.tokenPriceValue());
  }

  async getTokenPriceCurrency(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.tokenPriceCurrency());
  }

  async getTokenPriceChange(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.tokenPriceChange());
  }

  async getTokenBalanceLabel(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.tokenBalanceLabel());
  }

  async getTokenBalanceValue(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.tokenBalanceValue());
  }

  async getTokenBalanceCurrency(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.tokenBalanceCurrency());
  }

  async getTokenBalanceTotal(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.tokenBalanceTotal());
  }

  async getTransactionsListTitle(): Promise<string | number> {
    await webTester.waitUntilSeeElement(this.transactionsListTitle(), 20_000);
    return await webTester.getTextValueFromElement(this.transactionsListTitle());
  }

  toJSLocator(): string {
    return this.CONTAINER;
  }

  locatorStrategy(): LocatorStrategy {
    return 'xpath';
  }
}
