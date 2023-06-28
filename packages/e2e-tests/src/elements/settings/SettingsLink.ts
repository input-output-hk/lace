/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

export class SettingsLink {
  private readonly testIdSelector: string;

  constructor(testIdSelector: string) {
    this.testIdSelector = testIdSelector;
  }

  get element(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`[data-testid="${this.testIdSelector}"]`);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`[data-testid="${this.testIdSelector}-title"]`);
  }

  get description(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`[data-testid="${this.testIdSelector}-description"]`);
  }

  get addon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`[data-testid="${this.testIdSelector}-addon"]`);
  }

  getTitleText(): Promise<string> {
    return this.title.getText();
  }

  getDescriptionText(): Promise<string> {
    return this.description.getText();
  }
}
