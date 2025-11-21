/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class TopUpWalletSmallCard {
  private CARD = '[data-testid="top-up-wallet-small-card"]';
  private TITLE = '[data-testid="top-up-wallet-small-card-title"]';
  private BUY_ADA_BUTTON = '[data-testid="top-up-wallet-card-button"]';
  private DISCLAIMER = '[data-testid="top-up-wallet-small-card-disclaimer"]';

  get card(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CARD);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TITLE);
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

export default new TopUpWalletSmallCard();
