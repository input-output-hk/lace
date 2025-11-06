/* global WebdriverIO */
import type { ChainablePromiseElement } from 'webdriverio';
import NotificationListItem from './NotificationListItem';

class NotificationsMenu {
  private readonly NOTIFICATIONS_MENU_COMPONENT = '[data-testid="notifications-menu"]';
  private readonly NOTIFICATIONS_LIST = '[data-testid="notifications-list"]';
  private readonly VIEW_ALL_BUTTON = '[data-testid="notifications-menu-view-all-button"]';
  private readonly MARK_ALL_AS_READ_BUTTON = '[data-testid="notifications-menu-mark-all-as-read-button"]';
  private readonly MANAGE_SUBSCRIPTIONS_BUTTON = '[data-testid="notifications-menu-manage-subscriptions-button"]';

  get notificationsMenuComponent(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NOTIFICATIONS_MENU_COMPONENT);
  }

  get notificationsList(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NOTIFICATIONS_LIST);
  }

  get viewAllButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.VIEW_ALL_BUTTON);
  }

  get markAllAsReadButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MARK_ALL_AS_READ_BUTTON);
  }

  get manageSubscriptions(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MANAGE_SUBSCRIPTIONS_BUTTON);
  }

  async clickOnButton(button: 'View all' | 'Mark all as read' | 'Manage subscriptions') {
    switch (button) {
      case 'View all':
        await this.viewAllButton.waitForClickable();
        await this.viewAllButton.click();
        break;
      case 'Mark all as read':
        await this.markAllAsReadButton.waitForClickable();
        await this.markAllAsReadButton.click();
        break;
      case 'Manage subscriptions':
        await this.manageSubscriptions.waitForClickable();
        await this.manageSubscriptions.click();
        break;
      default:
        throw new Error(`Unsupported button: ${button}`);
    }
  }

  async getNotification(index: number) {
    return new NotificationListItem('menu', index);
  }

  async clickOnNotification(index: number): Promise<void> {
    const notification = await this.getNotification(index);
    await notification?.container.scrollIntoView();
    await notification?.click();
  }
}

export default new NotificationsMenu();
