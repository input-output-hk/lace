/* eslint-disable no-undef */
import webTester, { LocatorStrategy } from '../../actor/webTester';
import { WebElement, WebElementFactory as Factory } from '../webElement';

export class NetworkComponent extends WebElement {
  private NETWORK_CONTAINER = '//div[@data-testid="network-header-container"]';
  private NETWORK_HEADER_TITLE = '//div[@data-testid="network-header-title"]';
  private CURRENT_EPOCH_LABEL = '//div[@data-testid="network-current-epoch-label"]';
  private CURRENT_EPOCH_DETAIL = '//div[@data-testid="network-current-epoch-detail"]';
  private EPOCH_END_LABEL = '//div[@data-testid="network-epoch-end-label"]';
  private EPOCH_END_DETAIL = '//div[@data-testid="network-epoch-end-detail"]';
  private TOTAL_POOLS_LABEL = '//div[@data-testid="network-total-pools-label"]';
  private TOTAL_POOLS_DETAIL = '//div[@data-testid="network-total-pools-detail"]';
  private NETWORK_STAKED_LABEL = '//div[@data-testid="network-staked-label"]';
  private NETWORK_STAKED_DETAIL = '//div[@data-testid="network-staked-detail"]';
  private NETWORK_AVG_APY_LABEL = '//div[@data-testid="network-avg-apy-label"]';
  private NETWORK_AVG_APY_DETAIL = '//div[@data-testid="network-avg-apy-detail"]';
  private NETWORK_AVG_MARGIN_LABEL = '//div[@data-testid="network-avg-margin-label"]';
  private NETWORK_AVG_MARGIN_DETAIL = '//div[@data-testid="network-avg-margin-detail"]';

  constructor() {
    super();
  }

  networkContainer(): WebElement {
    return Factory.fromSelector(`${this.NETWORK_CONTAINER}`, 'xpath');
  }

  networkTitle(): WebElement {
    return Factory.fromSelector(`${this.NETWORK_HEADER_TITLE}`, 'xpath');
  }

  currentEpochLabel(): WebElement {
    return Factory.fromSelector(`${this.CURRENT_EPOCH_LABEL}`, 'xpath');
  }

  currentEpochDetail(): WebElement {
    return Factory.fromSelector(`${this.CURRENT_EPOCH_DETAIL}`, 'xpath');
  }

  epochEndLabel(): WebElement {
    return Factory.fromSelector(`${this.EPOCH_END_LABEL}`, 'xpath');
  }

  epochEndDetail(): WebElement {
    return Factory.fromSelector(`${this.EPOCH_END_DETAIL}`, 'xpath');
  }

  totalPoolsLabel(): WebElement {
    return Factory.fromSelector(`${this.TOTAL_POOLS_LABEL}`, 'xpath');
  }

  totalPoolsDetail(): WebElement {
    return Factory.fromSelector(`${this.TOTAL_POOLS_DETAIL}`, 'xpath');
  }

  percentageStakedLabel(): WebElement {
    return Factory.fromSelector(`${this.NETWORK_STAKED_LABEL}`, 'xpath');
  }

  percentageStakedDetail(): WebElement {
    return Factory.fromSelector(`${this.NETWORK_STAKED_DETAIL}`, 'xpath');
  }

  apyLabel(): WebElement {
    return Factory.fromSelector(`${this.NETWORK_AVG_APY_LABEL}`, 'xpath');
  }

  apyDetail(): WebElement {
    return Factory.fromSelector(`${this.NETWORK_AVG_APY_DETAIL}`, 'xpath');
  }

  marginLabel(): WebElement {
    return Factory.fromSelector(`${this.NETWORK_AVG_MARGIN_LABEL}`, 'xpath');
  }

  marginDetail(): WebElement {
    return Factory.fromSelector(`${this.NETWORK_AVG_MARGIN_DETAIL}`, 'xpath');
  }

  async getNetworkTitle(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.networkTitle());
  }

  async getCurrentEpochLabel(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.currentEpochLabel());
  }

  async getEpochEndLabel(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.epochEndLabel());
  }

  async getTotalPoolsLabel(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.totalPoolsLabel());
  }

  async getPercentageStakedLabel(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.percentageStakedLabel());
  }

  async getAvgAPYLabel(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.apyLabel());
  }

  async getAvgMarginLabel(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.marginLabel());
  }

  locatorStrategy(): LocatorStrategy {
    return 'xpath';
  }
}
