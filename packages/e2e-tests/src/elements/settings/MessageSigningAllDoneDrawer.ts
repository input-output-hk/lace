/* eslint-disable no-undef */
import CommonDrawerElements from '../CommonDrawerElements';
import type { ChainablePromiseElement } from 'webdriverio';

class MessageSigningAllDoneDrawer extends CommonDrawerElements {
  private IMAGE = '[data-testid="result-message-img"]';
  private TITLE = '[data-testid="result-message-title"]';
  private SIGNATURE = '[data-testid="sign-message-signature"]';
  private SIGNATURE_LABEL = '[data-testid="result-message-signature-label"]';
  private KEY = '[data-testid="sign-message-key"]';
  private KEY_LABEL = '[data-testid="result-message-key-label"]';
  private COPY_BUTTON = '[data-testid="copy-button"]';
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

  get key(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.KEY);
  }

  get keyLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.KEY_LABEL);
  }

  get copyButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COPY_BUTTON);
  }

  get closeButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CLOSE_BUTTON);
  }

  async clickOnCopySignatureToClipboardButton(): Promise<void> {
    await this.copyButton.waitForClickable();
    await this.copyButton.click();
  }

  async clickOnCloseButton(): Promise<void> {
    await this.closeButton.waitForClickable();
    await this.closeButton.click();
  }
}

export default new MessageSigningAllDoneDrawer();
