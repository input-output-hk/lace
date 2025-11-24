/* eslint-disable no-undef */
import CommonDrawerElements from '../CommonDrawerElements';
import type { ChainablePromiseElement } from 'webdriverio';
import PasswordInput from '../passwordInput';

class EnterYourPasswordDrawer extends CommonDrawerElements {
  private BANNER_ICON = '[data-testid="banner-icon"]';
  private BANNER_DESCRIPTION = '[data-testid="banner-description"]';
  private GENERATE_PAPER_WALLET_BUTTON = '[data-testid="generate-paper-wallet-button"]';

  get bannerIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.BANNER_ICON);
  }

  get bannerDescription(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.BANNER_DESCRIPTION);
  }

  get passwordInput(): typeof PasswordInput {
    return PasswordInput;
  }

  get generatePaperWalletButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.GENERATE_PAPER_WALLET_BUTTON);
  }

  async clickGeneratePaperWalletButton(): Promise<void> {
    await this.generatePaperWalletButton.waitForClickable();
    await this.generatePaperWalletButton.click();
  }
}

export default new EnterYourPasswordDrawer();
