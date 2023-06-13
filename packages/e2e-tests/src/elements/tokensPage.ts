/* eslint-disable no-undef */
import webTester, { LocatorStrategy } from '../actor/webTester';
import { WebElement, WebElementFactory as Factory } from './webElement';
import SectionTitle from './sectionTitle';
import { ChainablePromiseElement } from 'webdriverio';

export class TokensPage extends WebElement {
  private CONTAINER = '//section[@id="content"]';
  private BALANCE_LABEL = '//label[@data-testid="portfolio-balance-label"]';
  private BALANCE_VALUE = '//h1[@data-testid="portfolio-balance-value"]';
  private BALANCE_CURRENCY = '//h4[@data-testid="portfolio-balance-currency"]';
  private TOKENS_TABLE_ROW = '//tr[@data-testid="infinite-scrollable-table-row"]';
  private TOKENS_TABLE_ITEM_AVATAR = '//img[@data-testid="asset-table-cell-logo"]';
  private TOKENS_TABLE_ITEM_TITLE = '//p[@data-testid="asset-table-cell-title"]';
  private TOKENS_TABLE_ITEM_SUBTITLE = '//p[@data-testid="asset-table-cell-subtitle"]';
  private COINGECKO_CREDITS = '[data-testid="coingecko-credits"]';
  private COINGECKO_LINK = '[data-testid="coingecko-link"]';
  private RECEIVE_BUTTON_POPUP_MODE = 'main [data-testid="receive-button"]';
  private SEND_BUTTON_POPUP_MODE = 'main [data-testid="send-button"]';

  constructor() {
    super();
  }

  get sendButtonPopupMode(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SEND_BUTTON_POPUP_MODE);
  }

  get receiveButtonPopupMode(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.RECEIVE_BUTTON_POPUP_MODE);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return SectionTitle.sectionTitle;
  }

  get counter(): ChainablePromiseElement<WebdriverIO.Element> {
    return SectionTitle.sectionCounter;
  }

  get totalBalanceLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.BALANCE_LABEL);
  }

  totalBalanceValue(): WebElement {
    return Factory.fromSelector(`${this.BALANCE_VALUE}`, 'xpath');
  }

  totalBalanceCurrency(): WebElement {
    return Factory.fromSelector(`${this.BALANCE_CURRENCY}`, 'xpath');
  }

  tokensTableTitle(title: string): WebElement {
    return Factory.fromSelector(`//th[text() = '${title}']`, 'xpath');
  }

  tokensTableItemAvatar(index: number): WebElement {
    return Factory.fromSelector(`(${this.TOKENS_TABLE_ITEM_AVATAR})[${index}]`, 'xpath');
  }

  tokensTableItemTitle(index: number): WebElement {
    return Factory.fromSelector(`(${this.TOKENS_TABLE_ROW}[${index}]${this.TOKENS_TABLE_ITEM_TITLE})[1]`, 'xpath');
  }

  tokensTableItemSubTitle(index: number): WebElement {
    return Factory.fromSelector(`(${this.TOKENS_TABLE_ROW}[${index}]${this.TOKENS_TABLE_ITEM_SUBTITLE})[1]`, 'xpath');
  }

  tokensTableItemValue(index: number, mode: 'extended' | 'popup'): WebElement {
    const tableCellIndex = mode === 'extended' ? 3 : 2;
    return Factory.fromSelector(
      `(${this.TOKENS_TABLE_ROW}[${index}]${this.TOKENS_TABLE_ITEM_TITLE})[${tableCellIndex}]`,
      'xpath'
    );
  }

  tokensTableItemValueFiat(index: number, mode: 'extended' | 'popup'): WebElement {
    const tableCellIndex = mode === 'extended' ? 3 : 2;
    return Factory.fromSelector(
      `(${this.TOKENS_TABLE_ROW}[${index}]${this.TOKENS_TABLE_ITEM_SUBTITLE})[${tableCellIndex}]`,
      'xpath'
    );
  }

  tokensTableItemWithName(tokenName: string): ChainablePromiseElement<WebdriverIO.Element> {
    const selector = `${this.TOKENS_TABLE_ROW}[descendant::*[text()='${tokenName}']]`;
    return $(selector);
  }

  get coinGeckoCredits(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COINGECKO_CREDITS);
  }

  get coinGeckoLink(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COINGECKO_LINK);
  }

  async getTotalBalanceValue(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.totalBalanceValue());
  }

  async getTotalBalanceCurrency(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.totalBalanceCurrency());
  }

  async getRows(): Promise<WebdriverIO.ElementArray> {
    return $$(`${this.TOKENS_TABLE_ROW}`);
  }

  async getTokensTableItemTitle(index: number): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.tokensTableItemTitle(index));
  }

  async getTokensTableItemSubTitle(index: number): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.tokensTableItemSubTitle(index));
  }

  async getTokenTableItemValueByIndex(index: number, mode: 'extended' | 'popup'): Promise<number> {
    const tokenValue = (await webTester.getTextValueFromElement(this.tokensTableItemValue(index, mode))) as string;
    return Number.parseFloat(tokenValue.replaceAll(',', ''));
  }

  async getTokenTableItemValueByName(tokenName: string, mode: 'extended' | 'popup'): Promise<number> {
    const tokenValue = (await webTester.getTextValueFromElement(
      this.tokensTableItemValue(await this.getTokenRowIndex(tokenName), mode)
    )) as string;
    return Number.parseFloat(tokenValue.replaceAll(',', ''));
  }

  async getTokenTableItemValueFiatByIndex(index: number, mode: 'extended' | 'popup'): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.tokensTableItemValueFiat(index, mode));
  }

  async getTokenNames(): Promise<string[]> {
    const rowsNumber = await this.getRows();
    const names = [];
    for (let i = 1; i <= rowsNumber.length; i++) {
      names.push(String(await this.getTokensTableItemTitle(i)));
    }
    return names;
  }

  async getTokenTickers(): Promise<string[]> {
    const rowsNumber = await this.getRows();
    const tickers = [];
    for (let i = 1; i <= rowsNumber.length; i++) {
      tickers.push(String(await this.getTokensTableItemSubTitle(i)));
    }
    return tickers;
  }

  async getTokenRowIndex(tokenName: string): Promise<number> {
    const tokens = await this.getTokenNames();
    return tokens.indexOf(tokenName) + 1;
  }

  toJSLocator(): string {
    return this.CONTAINER;
  }

  locatorStrategy(): LocatorStrategy {
    return 'xpath';
  }
}
