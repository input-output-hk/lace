/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

export class SortingOption {
  private readonly optionName;
  constructor(optionName: 'ticker' | 'saturation' | 'ros' | 'cost' | 'margin' | 'blocks' | 'pledge' | 'liveStake') {
    this.optionName = optionName;
  }

  get radioButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`#radio-btn-control-id-${this.optionName}`);
  }

  get label(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`#radio-btn-label-id-${this.optionName}`);
  }
}
