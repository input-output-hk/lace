/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class DelegateYourVotingPowerBanner {
  private BANNER_CONTAINER = '[data-testid="register-as-drep-banner"]';
  private BANNER_TITLE = '[data-testid="register-as-drep-banner-title"]';
  private BANNER_DESCRIPTION = '[data-testid="register-as-drep-banner-description"]';
  private KNOW_MORE_LINK = '[data-testid="know-more-link"]';
  private REGISTER_BUTTON = '[data-testid="register-now-at-gov-tool-button"]';

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

  get registerButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.REGISTER_BUTTON);
  }

  async clickOnKnowMoreLink(): Promise<void> {
    await this.knowMoreLink.click();
  }

  async clickRegisterButton(): Promise<void> {
    await this.registerButton.waitForClickable();
    await this.registerButton.click();
  }
}

export default new DelegateYourVotingPowerBanner();
