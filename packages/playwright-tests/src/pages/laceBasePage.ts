import { Locator, Page } from '@playwright/test';
import { BasePage } from './basePage';

export class LaceBasePage extends BasePage {
  readonly totalBalance: Locator;

  constructor(page: Page) {
    super(page);
    this.totalBalance = page.getByTestId('portfolio-balance-value');
  }

  getBaseUrlFromCurrentUrl(): string {
    const parts = this.page.url().split('/');
    const baseUrlParts = parts.slice(0, -1);
    return baseUrlParts.join('/');
  }

  async waitForPageLoad(): Promise<void> {
    await this.totalBalance.waitFor({ state: 'visible' });
  }
}
