/* global WebdriverIO */
import { ChainablePromiseElement } from 'webdriverio';

class ImportantInformationAboutSharedWalletsModal {
  private DIALOG_TITLE = '[data-testid="dialog-title"]';
  private DIALOG_SUBTITLE = '[data-testid="dialog-subtitle"]';
  private DIALOG_CHECKBOX = '[data-testid="dialog-checkbox"]';
  private DIALOG_CHECKBOX_LABEL = '[data-testid="dialog-checkbox-label"]';
  private DIALOG_BACK_BUTTON = '[data-testid="dialog-back-button"]';
  private DIALOG_CONTINUE_BUTTON = '[data-testid="dialog-next-button"]';

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DIALOG_TITLE);
  }

  get subtitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DIALOG_SUBTITLE);
  }

  get checkbox(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DIALOG_CHECKBOX);
  }

  get checkboxLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DIALOG_CHECKBOX_LABEL);
  }

  get backButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DIALOG_BACK_BUTTON);
  }

  get continueButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DIALOG_CONTINUE_BUTTON);
  }

  async selectCheckbox(): Promise<void> {
    await this.checkbox.waitForClickable();
    await this.checkbox.click();
  }

  async clickOnBackButton(): Promise<void> {
    await this.backButton.waitForClickable();
    await this.backButton.click();
  }

  async clickOnContinueButton(): Promise<void> {
    await this.continueButton.waitForClickable();
    await this.continueButton.click();
  }
}

export default new ImportantInformationAboutSharedWalletsModal();
