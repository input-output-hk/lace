/* eslint-disable no-undef */
import SectionTitle from './sectionTitle';
import { ChainablePromiseElement } from 'webdriverio';
import { ChainablePromiseArray } from 'webdriverio/build/types';
import TokensPageAssert from '../assert/tokensPageAssert';
import testContext from '../utils/testContext';
import { Asset } from '../data/Asset';

class TokensPage {
  private BALANCE_LABEL = '[data-testid="portfolio-balance-label"]';
  private BALANCE_VALUE = '[data-testid="portfolio-balance-value"]';
  private BALANCE_CURRENCY = '[data-testid="portfolio-balance-currency"]';
  private TOKENS_SEARCH_INPUT = '[data-testid="assets-search-input"]';
  private TOKENS_TABLE_ROW = '//tr[@data-testid="infinite-scrollable-table-row"]';
  private TOKEN_AVATAR = '[data-testid="asset-table-cell-logo"]';
  private TOKEN_NAME = '[data-testid="token-table-cell-name"]';
  private TOKEN_TICKER = '[data-testid="token-table-cell-ticker"]';
  private TOKEN_BALANCE = '[data-testid="token-table-cell-balance"]';
  private TOKEN_FIAT_BALANCE = '[data-testid="token-table-cell-fiat-balance"]';
  private TOKEN_PRICE = '[data-testid="token-table-cell-price"]';
  private TOKEN_VARIATION = '[data-testid="token-table-cell-price-variation"]';
  private COINGECKO_CREDITS = '[data-testid="coingecko-credits"]';
  private COINGECKO_LINK = '[data-testid="coingecko-link"]';
  private RECEIVE_BUTTON_POPUP_MODE = 'main [data-testid="receive-button"]';
  private SEND_BUTTON_POPUP_MODE = 'main [data-testid="send-button"]';
  private CLOSED_EYE_ICON = '[data-testid="closed-eye-icon"]';
  private OPENED_EYE_ICON = '[data-testid="opened-eye-icon"]';
  private TOKEN_ROW_SKELETON = '.ant-skeleton';
  private PRICE_FETCH_ERROR_DESCRIPTION = '[data-testid="banner-description"]';

  get sendButtonPopupMode(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SEND_BUTTON_POPUP_MODE);
  }

  get tokenTickerList(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $$(this.TOKEN_TICKER);
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

  get totalBalanceValue(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.BALANCE_VALUE);
  }

  get totalBalanceCurrency(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.BALANCE_CURRENCY);
  }

  get tokensSearchInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TOKENS_SEARCH_INPUT);
  }

  tokensAvatar(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return $$(this.TOKENS_TABLE_ROW)[index].$(this.TOKEN_AVATAR);
  }

  tokenName(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return $$(this.TOKENS_TABLE_ROW)[index].$(this.TOKEN_NAME);
  }

  tokenTicker(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return $$(this.TOKENS_TABLE_ROW)[index].$(this.TOKEN_TICKER);
  }

  tokenBalance(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return $$(this.TOKENS_TABLE_ROW)[index].$(this.TOKEN_BALANCE);
  }

  tokenFiatBalance(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return $$(this.TOKENS_TABLE_ROW)[index].$(this.TOKEN_FIAT_BALANCE);
  }

  tokenPriceAda(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return $$(this.TOKENS_TABLE_ROW)[index].$(this.TOKEN_PRICE);
  }

  tokenPriceChange(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return $$(this.TOKENS_TABLE_ROW)[index].$(this.TOKEN_VARIATION);
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

  get closedEyeIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CLOSED_EYE_ICON);
  }

  get openedEyeIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.OPENED_EYE_ICON);
  }

  get tokenRowSkeleton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TOKEN_ROW_SKELETON);
  }

  get priceFetchErrorDescription(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PRICE_FETCH_ERROR_DESCRIPTION);
  }

  async getRows(): Promise<WebdriverIO.ElementArray> {
    return $$(this.TOKENS_TABLE_ROW);
  }

  async getTokenBalanceAsFloatByIndex(index: number): Promise<number> {
    const tokenBalance = await this.tokenBalance(index).getText();
    return Number.parseFloat(tokenBalance.replace(/,/g, ''));
  }

  async getTokenBalanceAsFloatByName(tokenName: string): Promise<number> {
    const tokenIndex = await this.getTokenRowIndex(tokenName);
    return await this.getTokenBalanceAsFloatByIndex(tokenIndex);
  }

  async getTokenNames(): Promise<string[]> {
    const rowsNumber = await this.getRows();
    const names = [];
    for (let i = 0; i < rowsNumber.length; i++) {
      names.push(await this.tokenName(i).getText());
    }
    return names;
  }

  async getTokenTickers(): Promise<string[]> {
    const rowsNumber = await this.getRows();
    const tickers = [];
    for (let i = 0; i < rowsNumber.length; i++) {
      tickers.push(await this.tokenTicker(i).getText());
    }
    return tickers;
  }

  async getTokenRowIndex(tokenName: string): Promise<number> {
    const tokens = await this.getTokenNames();
    return tokens.indexOf(tokenName);
  }

  async getTokensCounterAsNumber(): Promise<number> {
    return SectionTitle.getCounterAsNumber();
  }

  async waitForPricesToBeFetched() {
    await this.totalBalanceValue.waitForDisplayed({ timeout: TokensPageAssert.ADA_PRICE_CHECK_INTERVAL });
  }

  async clickTokenWithName(tokenName: string) {
    // Webdriver.io complains about table row element not being interactable on Firefox, need to click on one of nested elements to override that issue
    await (browser.isFirefox
      ? this.tokensTableItemWithName(tokenName).$(this.TOKEN_NAME).click()
      : this.tokensTableItemWithName(tokenName).click());
  }

  async waitUntilHeadersLoaded() {
    await this.title.waitForDisplayed({ timeout: 30_000 });
    await this.totalBalanceLabel.waitForDisplayed({ timeout: 30_000 });
  }

  async waitUntilCardanoTokenLoaded() {
    const selector = 'p=Cardano';
    await $(selector).waitForClickable({ timeout: 120_000 });
  }

  async saveTokenBalance(tokenName: string) {
    const rowIndex = await this.getTokenRowIndex(tokenName);
    const tokenBalance = await this.getTokenBalanceAsFloatByIndex(rowIndex);
    testContext.save(`${Asset.getByName(tokenName)?.ticker}tokenBalance`, tokenBalance);
  }

  async loadTokenBalance(tokenName: string) {
    return testContext.load(`${Asset.getByName(tokenName)?.ticker}tokenBalance`);
  }

  async clickOnCoinGeckoCreditsLink() {
    await this.coinGeckoLink.scrollIntoView();
    await this.coinGeckoLink.waitForClickable();
    await this.coinGeckoLink.click();
  }
}

export default new TokensPage();
