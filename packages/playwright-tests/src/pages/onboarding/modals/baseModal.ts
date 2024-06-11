import { Locator, Page } from '@playwright/test';

export class BaseModal {
  readonly page: Page;
  readonly cancelButton: Locator;
  readonly confirmButton: Locator;
  readonly totalBalance: Locator;

  constructor(page: Page) {
    this.page = page;
    this.cancelButton = page.getByTestId('data-testid="delete-address-modal-cancel');
    this.confirmButton = page.getByTestId('delete-address-modal-confirm');
    this.totalBalance = page.getByTestId('portfolio-balance-value');
  }

  async clickAgree(): Promise<void> {
    await this.confirmButton.click();
  }
}
