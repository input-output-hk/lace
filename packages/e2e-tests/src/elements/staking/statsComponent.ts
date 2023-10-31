/* eslint-disable no-undef*/
export class StatsComponent {
  protected CONTAINER;
  private TITLE = '//div[@data-testid="stats-title"]';
  private VALUE = '//div[@data-testid="stats-value"]';

  constructor(containerSelector: string) {
    this.CONTAINER = containerSelector;
  }

  get container(): ChainablePromiseElement {
    return $(this.CONTAINER);
  }

  get title(): ChainablePromiseElement {
    return $(`${this.CONTAINER}${this.TITLE}`);
  }

  get value(): ChainablePromiseElement {
    return $(`${this.CONTAINER}${this.VALUE}`);
  }
}
