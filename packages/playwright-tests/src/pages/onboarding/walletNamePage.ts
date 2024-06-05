import { Locator, Page } from '@playwright/test';

import { BasePage } from './../basePage';

export class WalletNamePage extends BasePage {
  readonly walletNameInput: Locator;
  readonly nextButton: Locator;

  constructor(page: Page) {
    super(page);
    this.walletNameInput = page.locator('input[data-testid="wallet-setup-register-name-input"]');
    this.nextButton = page.locator('button[data-testid="wallet-setup-step-btn-next"]');
  }

  async enterWalletName(walletName: string): Promise<void> {
    const walletNameMaxChars = 20;
    await this.walletNameInput.fill(walletName.slice(0, walletNameMaxChars));
    await this.nextButton.click();
  }
}
