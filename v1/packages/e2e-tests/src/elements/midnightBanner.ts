/* global WebdriverIO */
import { ChainablePromiseElement } from 'webdriverio';

class MidnightBanner {
  private readonly TITLE = '[data-testid="midnight-launch-banner-title"]';
  private readonly MIDNIGHT_REGISTRATION_BUTTON = '[data-testid="midnight-launch-banner-cta-button"]';
  private readonly CLOSE_BUTTON = '[data-testid="midnight-launch-banner-close-button"]';
  private readonly BANNER_DESCRIPTION_TEXT = '[data-testid="midnight-launch-banner-description"]';

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TITLE);
  }

  get midnightRegistrationButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MIDNIGHT_REGISTRATION_BUTTON);
  }

  get closeButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CLOSE_BUTTON);
  }

  get bannerDescriptionText(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.BANNER_DESCRIPTION_TEXT);
  }

  async clickOnMidnightRegistrationButton() {
    await this.midnightRegistrationButton.waitForClickable();
    await this.midnightRegistrationButton.click();
  }

  async clickOnCloseButton() {
    await this.closeButton.waitForClickable();
    await this.closeButton.click();
  }
}

export default new MidnightBanner();
