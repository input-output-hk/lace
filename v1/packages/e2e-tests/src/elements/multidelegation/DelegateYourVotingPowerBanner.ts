/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class DelegateYourVotingPowerBanner {
  private BANNER_CONTAINER = '[data-testid="register-as-drep-banner"]';
  private BANNER_TITLE = '[data-testid="register-as-drep-banner-title"]';
  private BANNER_DESCRIPTION = '[data-testid="register-as-drep-banner-description"]';
  private KNOW_MORE_LINK = '[data-testid="know-more-link"]';
  private REGISTER_NOW_BUTTON = '[data-testid="register-now-button"]';

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.BANNER_CONTAINER);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.BANNER_TITLE);
  }

  get description(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.BANNER_DESCRIPTION);
  }

  get knowMoreLink(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.KNOW_MORE_LINK);
  }

  get registerNowButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.REGISTER_NOW_BUTTON);
  }

  async clickOnKnowMoreLink(): Promise<void> {
    await this.knowMoreLink.click();
  }

  async clickRegisterNowButton(): Promise<void> {
    await this.registerNowButton.waitForClickable();
    await this.registerNowButton.click();
  }
}

export default new DelegateYourVotingPowerBanner();
