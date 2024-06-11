import { Locator, Page } from '@playwright/test';

import { BasePage } from '../basePage';

export class PassphrasePage extends BasePage {
  readonly nextButton: Locator;
  readonly mnemonicWordInput: Locator;

  constructor(page: Page) {
    super(page);
    this.nextButton = page.locator('button[data-testid="wallet-setup-step-btn-next"]');
    this.mnemonicWordInput = page.getByTestId('mnemonic-word-input');
  }

  async enter24Passphrase(passphrase: string): Promise<void> {
    const elements = await this.mnemonicWordInput.all();
    const mnemonics = passphrase.split(' ');
    // eslint-disable-next-line no-magic-numbers
    // await expect(elements).toHaveLength(24);
    for (const [i, input] of elements.entries()) {
      await input.fill(mnemonics[i]);
    }
  }

  async clickNextButton(): Promise<void> {
    await this.nextButton.click();
  }
}
