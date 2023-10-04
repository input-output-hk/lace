/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

export class StakePoolListItem {
  private LIST_ITEM = '[data-testid="stake-pool-table-item"]';
  private LOGO = '[data-testid="stake-pool-list-logo"]';
  private NAME = '[data-testid="stake-pool-list-name"]';
  private TICKER = '[data-testid="stake-pool-list-ticker"]';
  private ROS = '[data-testid="stake-pool-list-apy"]';
  private SATURATION = '[data-testid="stake-pool-list-saturation"]';

  protected listItem;

  constructor(index = 0) {
    this.listItem = $$(this.LIST_ITEM)[index];
  }

  get logo(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.listItem.$(this.LOGO);
  }

  get name(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.listItem.$(this.NAME);
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
}
