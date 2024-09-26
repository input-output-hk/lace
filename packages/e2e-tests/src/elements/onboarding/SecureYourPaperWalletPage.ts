/* eslint-disable no-undef */

import CommonOnboardingElements from './commonOnboardingElements';
import { ChainablePromiseElement, Key } from 'webdriverio';
import { readFromFile } from '../../utils/fileUtils';
import clipboard from 'clipboardy';
import testContext from '../../utils/testContext';

class SecureYourPaperWalletPage extends CommonOnboardingElements {
  // TODO: update selectors when new lace-ui-toolkit package is released
  private PGP_KEY_NAME_INPUT = '[data-testid="pgp-public-key-reference"]';
  private PGP_KEY_NAME_INPUT_LABEL = '//form//label';
  private YOUR_PUBLIC_PGP_KEY_BLOCK_INPUT = '[data-testid="pgp-public-key-block"]';
  private YOUR_PUBLIC_PGP_KEY_BLOCK_INPUT_LABEL = '//span[contains(@class, "text-area-label")]';
  private FINGERPRINT_ICON = '[data-testid="fingerprint-icon"]';
  private FINGERPRINT_TEXT = '[data-testid="fingerprint-text"]';
  private VALIDATION_ERROR = '[data-testid="validation-error"]';

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

  get fingerprintIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.FINGERPRINT_ICON);
  }

  get fingerprintText(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.FINGERPRINT_TEXT);
  }

  get validationError(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.VALIDATION_ERROR);
  }

  async enterPgpKeyName(name: string): Promise<void> {
    await this.pgpKeyNameInput.waitForClickable();
    await this.pgpKeyNameInput.setValue(name);
  }

  async enterPublicPgpKey(type: string): Promise<void> {
    let key;
    switch (type) {
      case 'valid':
        key = readFromFile(import.meta.dirname, '../../data/test-paper-wallet-pub.asc');
        break;
      case 'malformed':
        key = 'zxcv';
        break;
      case 'private':
        key = readFromFile(import.meta.dirname, '../../data/test-paper-wallet-sec.asc');
        break;
      case 'too weak':
        key = readFromFile(import.meta.dirname, '../../data/test-paper-wallet-1024b-pub.asc');
        break;
      default:
        throw new Error(`Unsupported public PGP key type: ${type}`);
    }

    await clipboard.write(key);
    await this.yourPublicPgpKeyBlockInput.waitForClickable();
    await this.yourPublicPgpKeyBlockInput.click();
    await browser.keys([Key.Ctrl, 'v']);
    testContext.save('publicPgpKey', key);
  }
}

export default new SecureYourPaperWalletPage();
