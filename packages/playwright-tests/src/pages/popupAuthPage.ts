import { Locator, Page } from '@playwright/test';

import { BasePage } from './basePage';

export class PopupAuthPage extends BasePage {
  readonly authorizeButton: Locator;
  readonly cancelButton: Locator;
  readonly modalAlwaysButton: Locator;
  readonly modalOnceButton: Locator;

  constructor(page: Page) {
    super(page);
    this.authorizeButton = page.locator('//button[span[text()="Authorize"]]');
    this.cancelButton = page.locator('//button[span[text()="Cancel"]]');
    this.modalAlwaysButton = page.locator('button[data-testid="connect-modal-accept-always"]');
    this.modalOnceButton = page.locator('button[data-testid="connect-modal-accept-once"]');
  }

  async authorize(): Promise<void> {
    await this.authorizeButton.click();
    await this.modalAlwaysButton.click();
  }
}
