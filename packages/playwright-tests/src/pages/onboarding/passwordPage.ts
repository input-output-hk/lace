import { Locator, Page } from '@playwright/test';

import { BasePage } from './../basePage';

export class PasswordPage extends BasePage {
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly nextButton: Locator;

  constructor(page: Page) {
    super(page);
    this.passwordInput = page.locator('input[data-testid="wallet-setup-password-step-password"]');
    this.confirmPasswordInput = page.locator('input[data-testid="wallet-setup-password-step-confirm-password"]');
    this.nextButton = page.locator('button[data-testid="wallet-setup-step-btn-next"]');
  }

  async enterPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(password);
    await this.nextButton.click();
  }
}
