/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

export class TokenSearchResult {
  private TOKEN_NAME_SELECTOR = '//div[@data-testid="coin-search-row-info"]/h6';
  private TOKEN_BALANCE_SELECTOR = '//div[@data-testid="coin-search-row-amount"]/h6';
  private TOKEN_TICKER_SELECTOR = '//div[@data-testid="coin-search-row-info"]/p';
  private TOKEN_ICON = '//div[@data-testid="coin-search-row-icon"]';
  private readonly CONTAINER;

  constructor(tokenNameOrIndex: string | number) {
    this.CONTAINER =
      typeof tokenNameOrIndex === 'string'
        ? `//div[@data-testid="coin-search-row" and descendant::h6[text()="${tokenNameOrIndex}"]]`
        : `(//div[@data-testid="coin-search-row"])[${tokenNameOrIndex}]`;
  }

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER);
  }

  get name(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.TOKEN_NAME_SELECTOR}`);
  }

  get balance(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.TOKEN_BALANCE_SELECTOR}`);
  }

  get ticker(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(String(`${this.CONTAINER}${this.TOKEN_TICKER_SELECTOR}`));
  }

  get grayedOutTokenIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(String(`(${this.CONTAINER}${this.TOKEN_ICON}//div[contains(@class, 'overlay')]`));
  }

  get checkmarkInSelectedToken(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(String(`(${this.CONTAINER}${this.TOKEN_ICON}//*[name()='svg']`));
  }
}
