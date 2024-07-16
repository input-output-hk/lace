/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class TopUpWalletDialog {
  private BODY = '[role="alertdialog"]';
  private TITLE = '[data-testid="dialog-title"]';
  private DISCLAIMER_PART1 = '[data-testid="top-up-wallet-dialog-disclaimer-part1"]';
  private DISCLAIMER_PART2 = '[data-testid="top-up-wallet-dialog-disclaimer-part2"]';
  private DISCLAIMER_LINK_CAPTION_1 = '[data-testid="top-up-wallet-dialog-disclaimer-link-caption-1"]';
  private DISCLAIMER_LINK_CAPTION_2 = '[data-testid="top-up-wallet-dialog-disclaimer-link-caption-2"]';
  private GO_BACK_BUTTON = '[data-testid="top-up-wallet-dialog-go-back-button"]';
  private CONTINUE_BUTTON = '[data-testid="top-up-wallet-dialog-continue-button"]';

  get body(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.BODY);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TITLE);
  }

  get disclaimerPart1(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DISCLAIMER_PART1);
  }

  get disclaimerPart2(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DISCLAIMER_PART2);
  }

  get disclaimerLinkCaption1(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DISCLAIMER_LINK_CAPTION_1);
  }

  get disclaimerLinkCaption2(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DISCLAIMER_LINK_CAPTION_2);
  }

  get goBackButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.GO_BACK_BUTTON);
  }

  get continueButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTINUE_BUTTON);
  }

  async clickGoBackButton(): Promise<void> {
    await this.goBackButton.waitForClickable();
    await this.goBackButton.click();
  }

  async clickContinueButton(): Promise<void> {
    await this.continueButton.waitForClickable();
    await this.continueButton.click();
  }
}

export default new TopUpWalletDialog();
