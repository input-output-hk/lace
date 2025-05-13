/* eslint-disable no-undef */
import CommonDrawerElements from '../CommonDrawerElements';
import type { ChainablePromiseElement } from 'webdriverio';

class SecureYourPaperWalletDrawer extends CommonDrawerElements {
  private PGP_KEY_NAME_INPUT = '[data-testid="pgp-public-key-reference-input"]';
  private PGP_KEY_NAME_INPUT_LABEL = '[data-testid="pgp-public-key-reference-label"]';
  private YOUR_PUBLIC_PGP_KEY_BLOCK_INPUT = '[data-testid="pgp-public-key-block-input"]';
  private YOUR_PUBLIC_PGP_KEY_BLOCK_INPUT_LABEL = '[data-testid="pgp-public-key-block-label"]';
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
