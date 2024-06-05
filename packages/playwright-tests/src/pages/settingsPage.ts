import { Locator, Page } from '@playwright/test';

import { BasePage } from './basePage';
import { NetworkDrawer } from './components/networkDrawer';

export class SettingsPage extends BasePage {
  readonly networkLink: Locator;

  constructor(page: Page) {
    super(page);
    this.networkLink = page.locator('div[data-testid="settings-wallet-network-link"]');
  }

  async switchNetwork(network: string): Promise<void> {
    await this.networkLink.click();
    switch (network) {
      case 'preprod':
        await new NetworkDrawer(this.page).preprodRadioButton.click();
        break;
      case 'preview':
        await new NetworkDrawer(this.page).previewRadioButton.click();
        break;
      case 'mainnet':
        await new NetworkDrawer(this.page).mainnetRadioButton.click();
        break;
      default:
        throw new Error(`Unknown network: ${network}`);
    }
    await new NetworkDrawer(this.page).closeDrawerButton.click();
  }
}
