/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class AnalyticsBanner {
  private CONTAINER = '//div[@data-testid="analytics-banner-container"]';
  private AGREE_BUTTON = '//button[@data-testid="analytics-accept-button"]';
  private REJECT_BUTTON = '//button[@data-testid="analytics-reject-button"]';

  get agreeButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.AGREE_BUTTON}`);
  }

  get rejectButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.REJECT_BUTTON}`);
  }
}

export default new AnalyticsBanner();
