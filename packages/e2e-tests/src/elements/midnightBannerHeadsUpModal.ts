/* global WebdriverIO */
import { ChainablePromiseElement } from 'webdriverio';

class MidnightBannerHeadsUpModal {
  private readonly HEADS_UP_MODAL_TITLE = '[data-testid="dialog-title"]';
  private readonly HEADS_UP_MODAL_CANCEL_BUTTON = '//span[text()="Cancel"]';

  get headsUpModalTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.HEADS_UP_MODAL_TITLE);
  }

  get headsUpModalCancelButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.HEADS_UP_MODAL_CANCEL_BUTTON);
  }

  async clickOnCancelButton() {
    await this.headsUpModalCancelButton.waitForClickable();
    await this.headsUpModalCancelButton.click();
  }
}

export default new MidnightBannerHeadsUpModal();
