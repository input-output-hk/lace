/* global WebdriverIO */
import { ChainablePromiseElement } from 'webdriverio';

class NFTPrintLabModal {
  private DIALOG = '[role="alertdialog"]';
  private TITLE = '[data-testid="dialog-title"]';
  private DISCLAIMER = '[data-testid="nftprintlab-dialog-disclaimer-part1"]';
  private CAPTION = '[data-testid="nftprintlab-dialog-disclaimer-link-caption-1"]';
  private CANCEL_BUTTON = '[data-testid="nftprintlab-dialog-go-back-button"]';
  private CONTINUE_BUTTON = '[data-testid="nftprintlab-dialog-continue-button"]';

  get dialog(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DIALOG);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TITLE);
  }

  get disclaimer(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DISCLAIMER);
  }

  get caption(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CAPTION);
  }

  get cancelButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CANCEL_BUTTON);
  }

  get continueButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTINUE_BUTTON);
  }

  async clickOnCancelButton(): Promise<void> {
    await this.cancelButton.waitForStable();
    await this.cancelButton.click();
  }

  async clickOnContinueButton(): Promise<void> {
    await this.continueButton.waitForStable();
    await this.continueButton.click();
  }
}

export default new NFTPrintLabModal();
