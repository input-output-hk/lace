/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class PrivacyPolicyUpdateBanner {
  private CONTAINER = '//div[@data-testid="privacy-policy-update-banner-container"]';
  private AGREE_BUTTON = '//button[@data-testid="privacy-policy-update-accept-button"]';

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER);
  }

  get agreeButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.AGREE_BUTTON}`);
  }

  async clickOnAgreeButton(): Promise<void> {
    await this.agreeButton.waitForClickable();
    await this.agreeButton.click();
  }
}

export default new PrivacyPolicyUpdateBanner();
