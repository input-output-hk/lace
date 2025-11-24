/* global WebdriverIO */
import { ChainablePromiseElement } from 'webdriverio';

class MidnightBannerHeadsUpModal {
  private readonly HEADS_UP_MODAL_TITLE = '[data-testid="dialog-title"]';
  private readonly HEADS_UP_MODAL_DESCRIPTION = '[data-testid="dialog-description"]';
  private readonly HEADS_UP_MODAL_ACTION_BUTTON = '[data-testid="action-button"]';

  get headsUpModalTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.HEADS_UP_MODAL_TITLE);
  }

  get headsUpModalDescription(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.HEADS_UP_MODAL_DESCRIPTION);
  }

  get headsUpModalCancelButton(): ChainablePromiseElement<WebdriverIO.Element | undefined> {
    return $$(this.HEADS_UP_MODAL_ACTION_BUTTON)[0];
  }

  get headsUpModalConfirmButton(): ChainablePromiseElement<WebdriverIO.Element | undefined> {
    return $$(this.HEADS_UP_MODAL_ACTION_BUTTON)[1];
  }

  async clickOnCancelButton() {
    await this.headsUpModalCancelButton.waitForClickable();
    await this.headsUpModalCancelButton.click();
  }

  async clickOnConfirmButton() {
    await this.headsUpModalConfirmButton.waitForClickable();
    await this.headsUpModalConfirmButton.click();
  }
}

export default new MidnightBannerHeadsUpModal();
