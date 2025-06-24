/* global WebdriverIO */
import CommonDrawerElements from '../CommonDrawerElements';
import type { ChainablePromiseElement } from 'webdriverio';

class YourKeysDrawer extends CommonDrawerElements {
  private SHOW_PUBLIC_KEY_BUTTON = '[data-testid="show-public-key-button"]';

  get showPublicKeyButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SHOW_PUBLIC_KEY_BUTTON);
  }

  async clickOnShowPublicKey(): Promise<void> {
    await this.showPublicKeyButton.waitForStable();
    await this.showPublicKeyButton.click();
  }
}

export default new YourKeysDrawer();
