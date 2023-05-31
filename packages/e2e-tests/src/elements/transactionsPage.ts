/* eslint-disable no-undef */
import webTester, { LocatorStrategy } from '../actor/webTester';
import { WebElement, WebElementFactory as Factory } from './webElement';
import SectionTitle from './sectionTitle';
import { ChainablePromiseElement } from 'webdriverio';

export class TransactionsPage extends WebElement {
  private CONTAINER = '//section[@id="content"]';
  private TRANSACTIONS_DATE = '//p[@data-testid="transaction-date"]';
  private TRANSACTIONS_GROUPED_BY_DATE = '//li[@data-testid="grouped-asset-activity-list-item"]';
  private TRANSACTIONS_TABLE_ROW = '//div[@data-testid="asset-activity-item"]';
  private TRANSACTIONS_TABLE_ITEM_ICON = '//div[@data-testid="asset-icon"]';
  private TRANSACTIONS_TABLE_ITEM_TYPE = '//h6[@data-testid="transaction-type"]';
  private TRANSACTIONS_TABLE_ITEM_TOKENS_AMOUNT = '//h6[@data-testid="total-amount"]';
  private TRANSACTIONS_TABLE_ITEM_FIAT_AMOUNT = '//p[@data-testid="fiat-amount"]';
  private TRANSACTIONS_TABLE_ITEM_TIMESTAMP = '//p[@data-testid="timestamp"]';
  private TRANSACTIONS_SKELETON = '//div[@data-testid="infinite-scroll-skeleton"]';
  private TRANSACTIONS_EDUCATIONAL_BANNER = '//div[@data-testid="educational-list"]';
  private TRANSACTIONS_EDUCATIONAL_BANNER_TITLE = '//h1[@data-testid="educational-list-title"]';
  private TRANSACTIONS_EDUCATIONAL_BANNER_ROW = '//div[@data-testid="educational-list-row"]';
  private TRANSACTIONS_EDUCATIONAL_BANNER_ROW_ICON = '//img[@data-testid="educational-list-row-img"]';
  private TRANSACTIONS_EDUCATIONAL_BANNER_ROW_TITLE = '//h1[@data-testid="educational-list-row-title"]';
  private TRANSACTIONS_EDUCATIONAL_BANNER_ROW_SUBTITLE = '//p[@data-testid="educational-list-row-subtitle"]';

  constructor() {
    super();
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return SectionTitle.sectionTitle;
  }

  get counter(): ChainablePromiseElement<WebdriverIO.Element> {
    return SectionTitle.sectionCounter;
  }

  transactionsDate(index: number): WebElement {
    return Factory.fromSelector(`(${this.TRANSACTIONS_DATE})[${index}]`, 'xpath');
  }

  transactionsGroupedByDate(index: number): WebElement {
    return Factory.fromSelector(`(${this.TRANSACTIONS_GROUPED_BY_DATE})[${index}]`, 'xpath');
  }

  transactionsTableRow(index: number): WebElement {
    return Factory.fromSelector(`(${this.TRANSACTIONS_TABLE_ROW})[${index}]`, 'xpath');
  }

  transactionsTableItemIcon(index: number): WebElement {
    return Factory.fromSelector(
      `(${this.TRANSACTIONS_TABLE_ROW})[${index}]${this.TRANSACTIONS_TABLE_ITEM_ICON}`,
      'xpath'
    );
  }

  transactionsTableItemType(index: number): WebElement {
    return Factory.fromSelector(
      `(${this.TRANSACTIONS_TABLE_ROW})[${index}]${this.TRANSACTIONS_TABLE_ITEM_TYPE}`,
      'xpath'
    );
  }

  transactionsTableItemTokensAmount(index: number): WebElement {
    return Factory.fromSelector(
      `(${this.TRANSACTIONS_TABLE_ROW})[${index}]${this.TRANSACTIONS_TABLE_ITEM_TOKENS_AMOUNT}`,
      'xpath'
    );
  }

  transactionsTableItemFiatAmount(index: number): WebElement {
    return Factory.fromSelector(
      `(${this.TRANSACTIONS_TABLE_ROW})[${index}]${this.TRANSACTIONS_TABLE_ITEM_FIAT_AMOUNT}`,
      'xpath'
    );
  }

  transactionsTableItemTimestamp(index: number): WebElement {
    return Factory.fromSelector(
      `(${this.TRANSACTIONS_TABLE_ROW})[${index}]${this.TRANSACTIONS_TABLE_ITEM_TIMESTAMP}`,
      'xpath'
    );
  }

  transactionsInfiniteScroll(): WebElement {
    return Factory.fromSelector(`${this.TRANSACTIONS_SKELETON}`, 'xpath');
  }

  async getRows(): Promise<WebdriverIO.ElementArray> {
    return $$(`${this.TRANSACTIONS_TABLE_ROW}`);
  }

  async getGroupsOfDates(): Promise<WebdriverIO.ElementArray> {
    return $$(`${this.TRANSACTIONS_GROUPED_BY_DATE}`);
  }

  async getTransactionType(index: number): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.transactionsTableItemType(index));
  }

  async getTransactionTokensAmount(index: number): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.transactionsTableItemTokensAmount(index));
  }

  async getTransactionTimestamp(index: number): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.transactionsTableItemTimestamp(index));
  }

  async getTransactionFiatAmount(index: number): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.transactionsTableItemFiatAmount(index));
  }

  async getTransactionDate(index: number): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.transactionsDate(index));
  }

  transactionsEducationalBanner(): WebElement {
    return Factory.fromSelector(`${this.TRANSACTIONS_EDUCATIONAL_BANNER}`, 'xpath');
  }

  transactionsEducationalBannerTitle(): WebElement {
    return Factory.fromSelector(`${this.TRANSACTIONS_EDUCATIONAL_BANNER_TITLE}`, 'xpath');
  }

  transactionsEducationalBannerRow(index: number): WebElement {
    return Factory.fromSelector(`(${this.TRANSACTIONS_EDUCATIONAL_BANNER_ROW})[${index}]`, 'xpath');
  }

  transactionsEducationalBannerRowIcon(index: number): WebElement {
    return Factory.fromSelector(`(${this.TRANSACTIONS_EDUCATIONAL_BANNER_ROW_ICON})[${index}]`, 'xpath');
  }

  transactionsEducationalBannerRowTitle(index: number): WebElement {
    return Factory.fromSelector(`(${this.TRANSACTIONS_EDUCATIONAL_BANNER_ROW_TITLE})[${index}]`, 'xpath');
  }

  transactionsEducationalBannerRowSubTitle(index: number): WebElement {
    return Factory.fromSelector(`(${this.TRANSACTIONS_EDUCATIONAL_BANNER_ROW_SUBTITLE})[${index}]`, 'xpath');
  }

  toJSLocator(): string {
    return this.CONTAINER;
  }

  locatorStrategy(): LocatorStrategy {
    return 'xpath';
  }
}
