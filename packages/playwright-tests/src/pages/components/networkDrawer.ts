import { Locator, Page } from '@playwright/test';

import { BasePage } from './../basePage';

export class NetworkDrawer extends BasePage {
  readonly preprodRadioButton: Locator;
  readonly previewRadioButton: Locator;
  readonly mainnetRadioButton: Locator;
  readonly closeDrawerButton: Locator;

  constructor(page: Page) {
    super(page);
    this.preprodRadioButton = page.locator('div[data-testid="network-choice-radio-group"] a:nth-child(1)');
    this.previewRadioButton = page.locator('div[data-testid="network-choice-radio-group"] a:nth-child(2)');
    this.mainnetRadioButton = page.locator('div[data-testid="network-choice-radio-group"] a:nth-child(3)');
    this.closeDrawerButton = page.locator('button[data-testid="navigation-button-cross"]');
  }
}
