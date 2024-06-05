import { Locator, Page } from '@playwright/test';

import { BasePage } from './../basePage';

export class AllDonePage extends BasePage {
  readonly goToWalletButton: Locator;

  constructor(page: Page) {
    super(page);
    this.goToWalletButton = page.locator('button[data-testid="wallet-setup-step-btn-next"]');
  }

  async clickGoToWalletButton(): Promise<void> {
    await this.goToWalletButton.click();
  }
}
