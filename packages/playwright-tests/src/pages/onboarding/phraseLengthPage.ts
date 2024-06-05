import { Locator, Page } from '@playwright/test';

import { BasePage } from './../basePage';

export class PhraseLengthPage extends BasePage {
  readonly phrase12RadioButton: Locator;
  readonly phrase15RadioButton: Locator;
  readonly phrase24RadioButton: Locator;
  readonly nextButton: Locator;

  constructor(page: Page) {
    super(page);
    this.phrase12RadioButton = page.locator('//label[contains(@class,"ant-radio-wrapper")][1]');
    this.phrase15RadioButton = page.locator('//label[contains(@class,"ant-radio-wrapper")][2]');
    this.phrase24RadioButton = page.locator('//label[contains(@class,"ant-radio-wrapper")][3]');
    this.nextButton = page.locator('button[data-testid="wallet-setup-step-btn-next"]');
  }

  async click24PhraseRadioButton(): Promise<void> {
    await this.phrase24RadioButton.click();
    await this.nextButton.click();
  }
}
