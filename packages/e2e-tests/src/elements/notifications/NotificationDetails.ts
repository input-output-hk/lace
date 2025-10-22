/* global WebdriverIO */
import type { ChainablePromiseElement } from 'webdriverio';

class NotificationDetails {
  private readonly BACK_BUTTON = '[data-testid="notification-details-back-button"]';
  private readonly REMOVE_BUTTON = '[data-testid="notification-details-remove-button"]';
  private readonly VIEW_ALL_BUTTON = '[data-testid="notification-details-view-all-button"]';
  private readonly TITLE = '[data-testid="notification-details-title"]';
  private readonly PUBLISHER = '[data-testid="notification-details-publisher"]';
  private readonly TEXT = '[data-testid="notification-details-text"]';

  get backButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.BACK_BUTTON);
  }

  get removeButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.REMOVE_BUTTON);
  }

  get viewAllButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.VIEW_ALL_BUTTON);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TITLE);
  }

  get publisher(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PUBLISHER);
  }

  get text(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TEXT);
  }

  async clickOnButton(button: 'Back' | 'Remove' | 'View all' | 'View all notifications'): Promise<void> {
    switch (button) {
      case 'Back':
        await this.backButton.waitForClickable();
        await this.backButton.click();
        break;
      case 'Remove':
        await this.removeButton.waitForClickable();
        await this.removeButton.click();
        break;
      case 'View all':
      case 'View all notifications':
        await this.viewAllButton.waitForClickable();
        await this.viewAllButton.click();
        break;
      default:
        throw new Error(`Unsupported button: ${button}`);
    }
  }
}

export default new NotificationDetails();
