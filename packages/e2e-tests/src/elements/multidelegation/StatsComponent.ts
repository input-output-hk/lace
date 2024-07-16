/* eslint-disable no-undef*/
import { ChainablePromiseElement } from 'webdriverio';

export class StatsComponent {
  protected CONTAINER_SELECTOR;
  private TITLE = '[data-testid="stats-title"]';
  private VALUE = '[data-testid="stats-value"]';

  constructor(containerSelector: string) {
    this.CONTAINER_SELECTOR = containerSelector;
  }

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER_SELECTOR);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER_SELECTOR).$(this.TITLE);
  }

  get value(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER_SELECTOR).$(this.VALUE);
  }
}
