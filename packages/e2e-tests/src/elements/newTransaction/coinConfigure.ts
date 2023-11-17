/* eslint-disable no-undef */
import webTester, { LocatorStrategy } from '../../actor/webTester';
import { WebElement, WebElementFactory as Factory } from '../webElement';
import { ChainablePromiseElement } from 'webdriverio';

export class CoinConfigure extends WebElement {
  protected CONTAINER_BUNDLE = '//div[@data-testid="asset-bundle-container"]';
  protected CONTAINER = '//div[@data-testid="coin-configure"]';
  private TOKEN_NAME = '//div[@data-testid="coin-configure-text"]';
  private TOKEN_VALUE = '//p[@data-testid="coin-configure-balance"]';
  private TOKEN_INPUT = '//input[@data-testid="coin-configure-input"]';
  private TOKEN_FIAT_VALUE = '//p[@data-testid="coin-configure-fiat-value"]';
  private ASSET_REMOVE_BUTTON = '//div[@data-testid="asset-input-remove-button"]';
  private INSUFFICIENT_BALANCE_ERROR = '//span[@data-testid="coin-configure-error-message"]';
  private TOOLTIP = 'div.ant-tooltip-inner';
  private MAX_BUTTON = '//button[@data-testid="max-bttn"]';

  constructor(bundleIndex?: number, assetName?: string) {
    super();
    this.CONTAINER =
      typeof assetName === 'undefined'
        ? this.CONTAINER
        : `(${this.CONTAINER_BUNDLE})[${bundleIndex}]//div[contains(@data-testid-title,"${assetName}")]`;
  }

  container(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}`, 'xpath');
  }

  nameElement(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TOKEN_NAME}`, 'xpath');
  }

  balanceValueElement(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TOKEN_VALUE}`, 'xpath');
  }

  balanceFiatValueElement(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TOKEN_FIAT_VALUE}`, 'xpath');
  }

  input(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TOKEN_INPUT}`, 'xpath');
  }

  assetRemoveButton(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}/following-sibling::${this.ASSET_REMOVE_BUTTON.slice(2)}`, 'xpath');
  }

  get insufficientBalanceError(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER).$(this.INSUFFICIENT_BALANCE_ERROR);
  }

  assetMaxButton(): WebElement {
    return Factory.fromSelector(`(${this.CONTAINER}${this.MAX_BUTTON})`, 'xpath');
  }

  tooltip(): WebElement {
    return Factory.fromSelector(`${this.TOOLTIP}`, 'css selector');
  }

  async getName(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.nameElement());
  }

  async getAmount(): Promise<number> {
    return Number(await $(`${this.CONTAINER}${this.TOKEN_INPUT}`).getValue());
  }

  async getBalanceValue(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.balanceValueElement());
  }

  async getFiatBalanceValue(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.balanceFiatValueElement());
  }

  async getInputValue(): Promise<string | number> {
    return await webTester.getAttributeValueFromElement(this.input(), 'value');
  }

  toJSLocator(): string {
    return this.CONTAINER;
  }

  locatorStrategy(): LocatorStrategy {
    return 'xpath';
  }
}
