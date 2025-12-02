/* eslint-disable no-undef*/
export class StatsComponent {
  protected CONTAINER;
  private TITLE = '[data-testid="stats-title"]';
  private VALUE = '[data-testid="stats-value"]';

  constructor(containerSelector: string) {
    this.CONTAINER = containerSelector;
  }

  get container(): ChainablePromiseElement {
    return $(this.CONTAINER);
  }

  get title(): ChainablePromiseElement {
    return $(this.CONTAINER).$(this.TITLE);
  }

  get value(): ChainablePromiseElement {
    return $(this.CONTAINER).$(this.VALUE);
  }
}
