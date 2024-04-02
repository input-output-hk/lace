/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class AnalyticsBanner {
  private CONTAINER = '//div[@data-testid="analytics-banner-container"]';
  private AGREE_BUTTON = '//button[@data-testid="analytics-accept-button"]';
  private REJECT_BUTTON = '//button[@data-testid="analytics-reject-button"]';
  private MESSAGE = '//span[@data-testid="analytic-banner-message"]';
  private LEARN_MORE = '//span[@data-testid="analytic-banner-learn-more"]';

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER);
  }

  get agreeButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.AGREE_BUTTON}`);
  }

  get rejectButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.REJECT_BUTTON}`);
  }

  get message(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.MESSAGE}`);
  }

  get learnMore(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.LEARN_MORE}`);
  }
}

export default new AnalyticsBanner();
