/* global WebdriverIO */
import CommonOnboardingElements from './commonOnboardingElements';
import type { ChainablePromiseElement } from 'webdriverio';

class IncompatibleRecoveryPhraseErrorPage extends CommonOnboardingElements {
  private SAD_FACE_ICON = '[data-testid="sad-face-icon"]';
  private ERROR_MESSAGE = '[data-testid="asset-list-empty-state-message"]';

  get sadFaceIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SAD_FACE_ICON);
  }

  get errorMessage(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ERROR_MESSAGE);
  }

  async clickSelectAnotherWalletButton(): Promise<void> {
    await this.backButton.waitForClickable();
    await this.backButton.click();
  }

  async clickCreateNewButton(): Promise<void> {
    await this.nextButton.waitForClickable();
    await this.nextButton.click();
  }
}

export default new IncompatibleRecoveryPhraseErrorPage();
