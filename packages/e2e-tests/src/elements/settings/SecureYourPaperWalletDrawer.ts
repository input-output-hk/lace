/* eslint-disable no-undef */
import CommonDrawerElements from '../CommonDrawerElements';
import type { ChainablePromiseElement } from 'webdriverio';

class SecureYourPaperWalletDrawer extends CommonDrawerElements {
  // TODO: update selectors when new lace-ui-toolkit package is released
  private PGP_KEY_NAME_INPUT = '[data-testid="pgp-public-key-reference"]';
  private PGP_KEY_NAME_INPUT_LABEL = '//form//label';
  private YOUR_PUBLIC_PGP_KEY_BLOCK_INPUT = '[data-testid="pgp-public-key-block"]';
  private YOUR_PUBLIC_PGP_KEY_BLOCK_INPUT_LABEL = '//span[contains(@class, "text-area-label")]';
  private NEXT_BUTTON = '[data-testid="next-button"]';

  get pgpKeyNameInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PGP_KEY_NAME_INPUT);
  }

  get pgpKeyNameInputLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PGP_KEY_NAME_INPUT_LABEL);
  }

  get yourPublicPgpKeyBlockInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.YOUR_PUBLIC_PGP_KEY_BLOCK_INPUT);
  }

  get yourPublicPgpKeyBlockInputLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.YOUR_PUBLIC_PGP_KEY_BLOCK_INPUT_LABEL);
  }

  get nextButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NEXT_BUTTON);
  }

  async clickNextButton(): Promise<void> {
    await this.nextButton.waitForClickable();
    await this.nextButton.click();
  }
}

export default new SecureYourPaperWalletDrawer();
