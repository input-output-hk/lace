import { Locator, Page } from '@playwright/test';

export class BaseModal {
  readonly page: Page;
  readonly cancelButton: Locator;
  readonly confirmButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.cancelButton = page.locator('button[data-testid="delete-address-modal-cancel"]');
    this.confirmButton = page.locator('button[data-testid="delete-address-modal-confirm"]');
  }
}
