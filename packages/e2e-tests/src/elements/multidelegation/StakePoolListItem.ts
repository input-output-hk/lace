/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

export class StakePoolListItem {
  private SELECTED_POOLS_LIST = '[data-testid="selected-pools-list"]';
  private AVAILABLE_POOLS_LIST = '[data-testid="stake-pool-list-scroll-wrapper"]';
  private LIST_ITEM = '[data-testid="stake-pool-item"]';
  private CHECKBOX = '[data-testid="stake-pool-list-checkbox"]';
  private TICKER = '[data-testid="stake-pool-list-ticker"]';
  private ROS = '[data-testid="stake-pool-list-apy"]';
  private SATURATION = '[data-testid="stake-pool-list-saturation"]';
  private COST = '[data-testid="stake-pool-list-cost"]';
  private MARGIN = '[data-testid="stake-pool-list-margin"]';
  private BLOCKS = '[data-testid="stake-pool-list-blocks"]';
  private PLEDGE = '[data-testid="stake-pool-list-pledge"]';
  private LIVE_STAKE = '[data-testid="stake-pool-list-liveStake"]';

  protected listItem;

  constructor(index = 0, isOnSelectedPoolsList = false) {
    this.listItem = $(isOnSelectedPoolsList ? this.SELECTED_POOLS_LIST : this.AVAILABLE_POOLS_LIST).$$(this.LIST_ITEM)[
      index
    ];
  }

  get container(): ChainablePromiseElement<WebdriverIO.Element | undefined> {
    return this.listItem;
  }

  get checkbox(): ChainablePromiseElement<WebdriverIO.Element | undefined> {
    return this.listItem.$(this.CHECKBOX);
  }

  get ticker(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.listItem.$(this.TICKER);
  }

  get ros(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.listItem.$(this.ROS);
  }

  get saturation(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.listItem.$(this.SATURATION);
  }

  get cost(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.listItem.$(this.COST);
  }

  get margin(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.listItem.$(this.MARGIN);
  }

  get blocks(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.listItem.$(this.BLOCKS);
  }

  get pledge(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.listItem.$(this.PLEDGE);
  }

  get liveStake(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.listItem.$(this.LIVE_STAKE);
  }

  async clickOnCheckbox(): Promise<void> {
    await this.checkbox.waitForClickable();
    await this.checkbox.click();
  }
}
