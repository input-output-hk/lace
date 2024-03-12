/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

export class StakePoolGridCard {
  private SELECTED_POOLS_LIST = '[data-testid="selected-pools-list"]';
  private AVAILABLE_POOLS_LIST = '[data-testid="stake-pool-list-scroll-wrapper"]';
  private CARD = '[data-testid="stake-pool-card"]';
  private CARD_TITLE = '[data-testid="stake-pool-card-title"]';

  protected card;

  constructor(index = 0, isOnSelectedPoolsList = false) {
    this.card = $(isOnSelectedPoolsList ? this.SELECTED_POOLS_LIST : this.AVAILABLE_POOLS_LIST).$$(this.CARD)[index];
  }

  get container(): ChainablePromiseElement<WebdriverIO.Element | undefined> {
    return this.card;
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.card.$(this.CARD_TITLE);
  }

  async click(): Promise<void> {
    await this.card.scrollIntoView();
    await this.card.waitForClickable();
    await this.card.click();
  }
}
