/* global WebdriverIO */
import { ChainablePromiseElement } from 'webdriverio';

export class AddSharedWalletCommonModalElements {
  private CLOSE_BUTTON = '[data-testid="navigation-button-cross"]';
  private TITLE = '[data-testid="shared-wallet-step-title"]';
  private SUBTITLE = '[data-testid="shared-wallet-step-subtitle"]';
  private BACK_BUTTON = '[data-testid="shared-wallet-step-btn-back"]';
  private NEXT_BUTTON = '[data-testid="shared-wallet-step-btn-next"]';

  get closeButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CLOSE_BUTTON);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TITLE);
  }

  get subtitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SUBTITLE);
  }

  get backButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.BACK_BUTTON);
  }

  get nextButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NEXT_BUTTON);
  }

  async clickOnBackButton(): Promise<void> {
    await this.backButton.waitForClickable();
    await this.backButton.click();
  }

  async clickOnNextButton(): Promise<void> {
    await this.nextButton.waitForClickable();
    await this.nextButton.click();
  }
}
