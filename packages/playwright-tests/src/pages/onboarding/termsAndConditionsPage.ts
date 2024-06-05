import { Locator, Page } from '@playwright/test';

import { BasePage } from './../basePage';

export class TermsAndConditionsPage extends BasePage {
  readonly acceptCheckbox: Locator;
  readonly nextButton: Locator;

  constructor(page: Page) {
    super(page);
    this.acceptCheckbox = page.locator('div[data-testid="wallet-setup-legal-terms-container"] label');
    this.nextButton = page.locator('button[data-testid="wallet-setup-step-btn-next"]');
  }

  async clickAcceptTermsAndConditions(): Promise<void> {
    await this.acceptCheckbox.click();
    await this.nextButton.click();
  }
}
