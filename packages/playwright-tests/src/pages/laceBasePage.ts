import { Page } from '@playwright/test';
import { BasePage } from './basePage';

export class LaceBasePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  getBaseUrlFromCurrentUrl(): string {
    const parts = this.page.url().split('/');
    const baseUrlParts = parts.slice(0, -1);
    return baseUrlParts.join('/');
  }
}
