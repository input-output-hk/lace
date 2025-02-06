/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class WalletLockPage {
  private LACE_LOGO = '[data-testid="lock-screen-logo"]';
  private HELP_AND_SUPPORT_BUTTON = '[data-testid="lock-screen-help-button"]';
  private MAIN_IMG = '[data-testid="lock-screen-img"]';
  private TEXT1 = '[data-testid="lock-screen-text1"]';
  private TEXT2 = '[data-testid="lock-screen-text2"]';

  get laceLogo(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.LACE_LOGO);
  }

  get helpAndSupportButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.HELP_AND_SUPPORT_BUTTON);
  }

  get mainImg(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MAIN_IMG);
  }

  get text1(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TEXT1);
  }

  get text2(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TEXT2);
  }
}

export default new WalletLockPage();
