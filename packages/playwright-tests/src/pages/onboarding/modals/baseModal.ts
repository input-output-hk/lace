import { Locator, Page } from '@playwright/test';

export class BaseModal {
  readonly page: Page;
  readonly cancelButton: Locator;
  readonly confirmButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.cancelButton = page.getByTestId('data-testid="delete-address-modal-cancel');
    this.confirmButton = page.getByTestId('delete-address-modal-confirm');
  }

  async clickAgree(): Promise<void> {
    await this.confirmButton.click();
  }
}
