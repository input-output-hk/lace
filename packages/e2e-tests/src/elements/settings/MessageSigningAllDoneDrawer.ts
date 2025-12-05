/* eslint-disable no-undef */
import CommonDrawerElements from '../CommonDrawerElements';
import type { ChainablePromiseElement } from 'webdriverio';

class MessageSigningAllDoneDrawer extends CommonDrawerElements {
  private IMAGE = '[data-testid="result-message-img"]';
  private TITLE = '[data-testid="result-message-title"]';
  private SIGNATURE = '[data-testid="sign-message-signature-input"]';
  private SIGNATURE_LABEL = '[data-testid="result-message-signature-label"]';
  private SIGNATURE_COPY_TO_CLIPBOARD_BUTTON = '[data-testid="signature-copy-to-clipboard-button"]';
  private KEY = '[data-testid="sign-message-key-input"]';
  private KEY_LABEL = '[data-testid="result-message-key-label"]';
  private KEY_COPY_TO_CLIPBOARD_BUTTON = '[data-testid="public-key-copy-to-clipboard-button"]';
  private SIGN_ANOTHER_MESSAGE_BUTTON = '[data-testid="sign-another-message-button"]';
  private CLOSE_BUTTON = '[data-testid="close-button"]';

  get image(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.IMAGE);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TITLE);
  }

  get signature(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SIGNATURE);
  }

  get signatureLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SIGNATURE_LABEL);
  }

  get signatureCopyToClipboardButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SIGNATURE_COPY_TO_CLIPBOARD_BUTTON);
  }

  get key(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.KEY);
  }

  get keyLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.KEY_LABEL);
  }

  get keyCopyToClipboardButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.KEY_COPY_TO_CLIPBOARD_BUTTON);
  }

  get signAnotherMessageButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SIGN_ANOTHER_MESSAGE_BUTTON);
  }

  get closeButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CLOSE_BUTTON);
  }

  async clickOnCopyToClipboardButtonInSignatureSection(): Promise<void> {
    if (browser.isFirefox) {
      await this.signatureCopyToClipboardButton.$('svg').waitForClickable();
      await this.signatureCopyToClipboardButton.$('svg').click();
    } else {
      await this.signatureCopyToClipboardButton.waitForClickable();
      await this.signatureCopyToClipboardButton.click();
    }
  }

  async clickOnCopyToClipboardButtonInPublicKeySection(): Promise<void> {
    if (browser.isFirefox) {
      await this.keyCopyToClipboardButton.$('svg').waitForClickable();
      await this.keyCopyToClipboardButton.$('svg').click();
    } else {
      await this.keyCopyToClipboardButton.waitForClickable();
      await this.keyCopyToClipboardButton.click();
    }
  }

  async clickOnSignAnotherMessageButton(): Promise<void> {
    await this.signAnotherMessageButton.waitForClickable();
    await this.signAnotherMessageButton.click();
  }

  async clickOnCloseButton(): Promise<void> {
    await this.closeButton.waitForClickable();
    await this.closeButton.click();
  }
}

export default new MessageSigningAllDoneDrawer();
