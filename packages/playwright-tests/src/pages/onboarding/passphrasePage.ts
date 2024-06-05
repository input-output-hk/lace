import { Locator, Page } from '@playwright/test';

import { BasePage } from './../basePage';

export class PassphrasePage extends BasePage {
  readonly nextButton: Locator;

  constructor(page: Page) {
    super(page);
    this.nextButton = page.locator('button[data-testid="wallet-setup-step-btn-next"]');
  }
}
