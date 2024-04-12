/* eslint-disable no-undef */
import webTester, { LocatorStrategy } from '../../actor/webTester';
import { WebElement, WebElementFactory as Factory } from './../webElement';

export class StakePoolListItem extends WebElement {
  protected TABLE_ROW = '//div[@data-testid="stake-pool-table-item"]';
  private LOGO = '//img[@data-testid="stake-pool-list-logo"]';
  private NAME = '//h6[@data-testid="stake-pool-list-name"]';
  private TICKER = '//p[@data-testid="stake-pool-list-ticker"]';
  private ROS = '//p[@data-testid="stake-pool-list-ros"]';
  private COST = '//p[@data-testid="stake-pool-list-cost"]';
  private SATURATION = '//p[@data-testid="stake-pool-list-saturation"]';

  constructor(index?: number) {
    super();
    this.TABLE_ROW =
      typeof index === 'undefined' || index.toString() === '' ? this.TABLE_ROW : `(${this.TABLE_ROW})[${index}]`;
  }

  container(): WebElement {
    return Factory.fromSelector(`${this.TABLE_ROW}`, 'xpath');
  }

  tableRowWithName(poolName: string): WebElement {
    return Factory.fromSelector(`${this.TABLE_ROW}[.//h6[contains(text(), '${poolName}')]]`, 'xpath');
  }

  async getRows(): Promise<WebdriverIO.ElementArray> {
    return $$(`${this.TABLE_ROW}`);
  }

  logo(): WebElement {
    return Factory.fromSelector(`${this.TABLE_ROW}${this.LOGO}`, 'xpath');
  }

  logoWithIndex(index: number): WebElement {
    return Factory.fromSelector(`(${this.LOGO})[${index}]`, 'xpath');
  }

  name(): WebElement {
    return Factory.fromSelector(`${this.TABLE_ROW}${this.NAME}`, 'xpath');
  }

  nameWithIndex(index: number): WebElement {
    return Factory.fromSelector(`(${this.NAME})[${index}]`, 'xpath');
  }

  ticker(): WebElement {
    return Factory.fromSelector(`${this.TABLE_ROW}${this.TICKER}`, 'xpath');
  }

  tickerWithIndex(index: number): WebElement {
    return Factory.fromSelector(`(${this.TICKER})[${index}]`, 'xpath');
  }

  ros(): WebElement {
    return Factory.fromSelector(`${this.TABLE_ROW}${this.ROS}`, 'xpath');
  }

  cost(): WebElement {
    return Factory.fromSelector(`${this.TABLE_ROW}${this.COST}`, 'xpath');
  }

  saturation(): WebElement {
    return Factory.fromSelector(`${this.TABLE_ROW}${this.SATURATION}`, 'xpath');
  }

  async getName(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.name());
  }

  async getTicker(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.ticker());
  }

  async getRos(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.ros());
  }

  async getCost(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.cost());
  }

  async getSaturation(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.saturation());
  }

  async getNameWithIndex(index: number): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.nameWithIndex(index));
  }

  async getTickerWithIndex(index: number): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.tickerWithIndex(index));
  }

  toJSLocator(): string {
    return this.TABLE_ROW;
  }

  locatorStrategy(): LocatorStrategy {
    return 'xpath';
  }
}
