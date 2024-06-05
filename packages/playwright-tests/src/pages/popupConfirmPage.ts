import { Locator, Page } from '@playwright/test';

import { BasePage } from './basePage';

export class PopupTransactionPage extends BasePage {
  readonly confirmButton: Locator;
  readonly passwordInput: Locator;
  readonly passwordConfirmButton: Locator;
  readonly closeModalButton: Locator;

  constructor(page: Page) {
    super(page);
    this.confirmButton = page.locator('button[data-testid="dapp-transaction-confirm"]');
    this.passwordInput = page.locator('input[data-testid="password-input"]');
    this.passwordConfirmButton = page.locator('//button[.//span[text()="Confirm"]]');
    this.closeModalButton = page.locator('button[data-testid="dapp-sign-tx-success-close-button"]');
  }

  async authorizeTransaction(walletPassword: string): Promise<void> {
    await this.confirmButton.click();
    await this.passwordInput.fill(walletPassword);
    await this.passwordConfirmButton.click();
    await this.closeModalButton.click();
  }
}
