/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

export class StakePoolGridCard {
  private SELECTED_POOLS_LIST = '[data-testid="selected-pools-list"]';
  private AVAILABLE_POOLS_LIST = '[data-testid="stake-pool-list-scroll-wrapper"]';
  private CARD = '[data-testid="stake-pool-card"]';
  private CARD_TITLE = '[data-testid="stake-pool-card-title"]';
  private SATURATION_VALUE = '[data-testid="saturation-value"]';
  private METRIC_VALUE = '[data-testid="stake-pool-metric-value"]';
  private SATURATION_PROGRESS_BAR = '[data-testid="stake-pool-card-saturation-bar"]';

  protected card: ChainablePromiseElement<WebdriverIO.Element | undefined>;

  constructor(index = 0, isOnSelectedPoolsList = false) {
    this.card = isOnSelectedPoolsList
      ? $$(`${this.SELECTED_POOLS_LIST} ${this.CARD}`)[index]
      : $(`${this.AVAILABLE_POOLS_LIST} [data-index="${index}"]`);
  }

  get container(): ChainablePromiseElement<WebdriverIO.Element | undefined> {
    return this.card;
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.card.$(this.CARD_TITLE);
  }

  get saturation(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.card.$(this.SATURATION_VALUE);
  }

  get metricValue(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.card.$(this.METRIC_VALUE);
  }

  get saturationProgressBar(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.card.$(this.SATURATION_PROGRESS_BAR);
  }

  async click(): Promise<void> {
    await this.card.scrollIntoView();
    await this.card.waitForClickable();
    await this.card.click();
  }
}
