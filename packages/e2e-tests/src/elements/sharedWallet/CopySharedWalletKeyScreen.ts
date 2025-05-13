/* global WebdriverIO */
import { ChainablePromiseElement } from 'webdriverio';
import { AddSharedWalletCommonModalElements } from './AddSharedWalletCommonModalElements';

class CopySharedWalletKeyScreen extends AddSharedWalletCommonModalElements {
  private SHARED_WALLET_KEYS_LABEL = '[data-testid="shared-wallet-keys-label"]';
  private SHARED_WALLET_KEYS_VALUE = '[data-testid="shared-wallet-keys-value"]';
  private FOOTER_CLOSE_BUTTON = '[data-testid="close-button"]';
  private COPY_KEY_TO_CLIPBOARD_BUTTON = '[data-testid="copy-key-to-clipboard-button"]';

  get sharedWalletKeysLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SHARED_WALLET_KEYS_LABEL);
  }

  get sharedWalletKeysValue(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SHARED_WALLET_KEYS_VALUE);
  }

  get footerCloseButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.FOOTER_CLOSE_BUTTON);
  }

  get copyKeyToClipboardButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COPY_KEY_TO_CLIPBOARD_BUTTON);
  }

  async clickOnCloseButton(): Promise<void> {
    await this.footerCloseButton.waitForClickable();
    await this.footerCloseButton.click();
  }

  async clickOnCopyToClipboardButton(): Promise<void> {
    await this.copyKeyToClipboardButton.waitForClickable();
    await this.copyKeyToClipboardButton.click();
  }
}

export default new CopySharedWalletKeyScreen();
