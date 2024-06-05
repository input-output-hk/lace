import { Locator, Page } from '@playwright/test';

import { BasePage } from './../basePage';
import { BaseModal } from './modals/baseModal';

export class SetupPage extends BasePage {
  readonly createButton: Locator;
  readonly connectButton: Locator;
  readonly restoreButton: Locator;

  constructor(page: Page) {
    super(page);
    this.createButton = page.locator('button[data-testid="create-wallet-button"]');
    this.connectButton = page.locator('button[data-testid="hardware-wallet-button"]');
    this.restoreButton = page.locator('button[data-testid="restore-wallet-button"]');
  }

  async clickCreateButton(): Promise<void> {
    await this.createButton.click();
  }

  async clickConnectButton(): Promise<void> {
    await this.connectButton.click();
  }

  async clickRestoreButton(): Promise<void> {
    await this.restoreButton.click();
    const restoreModal = new BaseModal(this.page);
    await restoreModal.confirmButton.click();
  }
}
