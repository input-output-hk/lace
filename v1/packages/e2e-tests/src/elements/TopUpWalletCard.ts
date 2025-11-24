/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class TopUpWalletCard {
  private CARD = '[data-testid="top-up-wallet-card"]';
  private BADGE = '[data-testid="top-up-wallet-card-badge"]';
  private TITLE = '[data-testid="top-up-wallet-card-title"]';
  private SUBTITLE = '[data-testid="top-up-wallet-card-subtitle"]';
  private BUY_ADA_BUTTON = '[data-testid="top-up-wallet-card-button"]';
  private DISCLAIMER = '[data-testid="top-up-wallet-card-disclaimer"]';

  get card(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CARD);
  }

  get badge(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.BADGE);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TITLE);
  }

  get subtitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SUBTITLE);
  }

  get buyAdaButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.BUY_ADA_BUTTON);
  }

  get disclaimer(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DISCLAIMER);
  }

  async clickBuyAdaButton(): Promise<void> {
    await this.buyAdaButton.waitForClickable();
    await this.buyAdaButton.click();
  }
}

export default new TopUpWalletCard();
