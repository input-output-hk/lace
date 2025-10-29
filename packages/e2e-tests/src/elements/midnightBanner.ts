/* global WebdriverIO */
import { ChainablePromiseElement } from 'webdriverio';

class MidnightBanner {
  private readonly TITLE = '[data-testid="midnight-event-banner-title"]';
  private readonly LEARN_MORE_BUTTON = '[data-testid="learn-more-button-extended"]';
  private readonly REMIND_ME_LATER_BUTTON = '[data-testid="remind-me-later-button-extended"]';
  private readonly CLOSE_BUTTON = '[data-testid="midnight-event-banner-close-button"]';
  private readonly BANNER_DESCRIPTION_TEXT = '[data-testid="midnight-event-banner-description"]';

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TITLE);
  }

  get learnMoreButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.LEARN_MORE_BUTTON);
  }

  get closeButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CLOSE_BUTTON);
  }

  get bannerDescriptionText(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.BANNER_DESCRIPTION_TEXT);
  }

  get remindMeLaterButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.REMIND_ME_LATER_BUTTON);
  }

  async clickOnLearnMoreButton() {
    await this.learnMoreButton.waitForClickable();
    await this.learnMoreButton.click();
  }

  async clickOnRemindMeLaterButton() {
    await this.remindMeLaterButton.waitForClickable();
    await this.remindMeLaterButton.click();
  }

  async clickOnCloseButton() {
    await this.closeButton.waitForClickable();
    await this.closeButton.click();
  }
}

export default new MidnightBanner();
