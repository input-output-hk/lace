import { Locator, Page } from '@playwright/test';

import { BasePage } from '../basePage';

export class WalletNameAndPasswordPage extends BasePage {
  readonly walletNameInput: Locator;
  readonly nextButton: Locator;
  readonly inputPassword: Locator;
  readonly inputPasswordConfirm: Locator;

  constructor(page: Page) {
    super(page);
    this.walletNameInput = page.getByTestId('wallet-name-input');
    this.nextButton = page.getByTestId('wallet-setup-step-btn-next');
    this.inputPassword = page.getByTestId('wallet-password-verification-input');
    this.inputPasswordConfirm = page.getByTestId('wallet-password-confirmation-input');
  }

  async enterName(walletName: string): Promise<void> {
    const walletNameMaxChars = 20;
    await this.walletNameInput.fill(walletName.slice(0, walletNameMaxChars));
    // await this.nextButton.click();
  }

  async enterPassword(password: string) {
    await this.inputPassword.fill(password);
    // await this.inputPasswordConfirm.click();
    await this.inputPasswordConfirm.fill(password);
  }
}
