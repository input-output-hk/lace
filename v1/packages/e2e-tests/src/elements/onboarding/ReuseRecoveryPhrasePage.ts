/* global WebdriverIO */
import CommonOnboardingElements from './commonOnboardingElements';
import type { ChainablePromiseElement } from 'webdriverio';

class ReuseRecoveryPhrasePage extends CommonOnboardingElements {
  private WALLET_SELECT_INPUT = '[data-testid="wallet-setup-select-input"]';

  get walletSelectInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.WALLET_SELECT_INPUT);
  }

  async clickReuseButton(): Promise<void> {
    await this.nextButton.waitForClickable();
    await this.nextButton.click();
  }

  async clickBackButton(): Promise<void> {
    await this.backButton.waitForClickable();
    await this.backButton.click();
  }

  async clickSkipButton(): Promise<void> {
    await this.skipButton.waitForClickable();
    await this.skipButton.click();
  }

  async selectWallet(walletName: string): Promise<void> {
    await this.walletSelectInput.waitForClickable();
    await this.walletSelectInput.click();
    const walletOptionSelector = `//div[@role="option"][contains(.,"${walletName}")]`;
    const walletOption = $(walletOptionSelector);
    await walletOption.waitForClickable();
    await walletOption.click();
  }
}

export default new ReuseRecoveryPhrasePage();
