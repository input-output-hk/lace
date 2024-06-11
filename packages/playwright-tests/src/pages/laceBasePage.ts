import { Page } from '@playwright/test';
import { BasePage } from './basePage';
import { BaseModal } from './onboarding/modals/baseModal';

export class LaceBasePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  getBaseUrlFromCurrentUrl(): string {
    const parts = this.page.url().split('/');
    const baseUrlParts = parts.slice(0, -1);
    return baseUrlParts.join('/');
  }

  async waitForPageLoad(): Promise<void> {
    await new BaseModal(this.page).clickAgree();
    await new BaseModal(this.page).totalBalance.waitFor({ state: 'visible' });
  }
}
