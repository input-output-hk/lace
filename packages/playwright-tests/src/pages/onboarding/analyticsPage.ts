import { Locator, Page } from '@playwright/test';

import { BasePage } from './../basePage';

export class AnalyticsPage extends BasePage {
  readonly skipButton: Locator;
  readonly agreeButton: Locator;

  constructor(page: Page) {
    super(page);
    this.skipButton = page.locator('button[data-testid="wallet-setup-step-btn-skip"]');
    this.agreeButton = page.locator('button[data-testid="wallet-setup-step-btn-next"]');
  }
  async clickAgreeButton(): Promise<void> {
    await this.agreeButton.click();
  }
}
