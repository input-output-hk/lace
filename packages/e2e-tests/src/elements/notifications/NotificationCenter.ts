/* global WebdriverIO */
import type { ChainablePromiseElement } from 'webdriverio';
import NotificationListItem from './NotificationListItem';

class NotificationCenter {
  private readonly SECTION_TITLE = '[data-testid="section-title"]';
  private readonly NAVIGATION_BUTTON_BACK = '[data-testid="navigation-button-arrow"]';
  private readonly SECTION_TITLE_COUNTER = '[data-testid="section-title-counter"]';
  private readonly SUBSCRIPTIONS_DROPDOWN = '[data-testid="subscriptions"]';
  private readonly MARK_ALL_AS_READ_BUTTON = '[data-testid="mark-all-as-read-button"]';
  private readonly NOTIFICATIONS_LIST = '[data-testid="notifications-list"]';

  get sectionTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SECTION_TITLE);
  }

  get navigationButtonBack(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NAVIGATION_BUTTON_BACK);
  }

  get sectionTitleCounter(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SECTION_TITLE_COUNTER);
  }

  get subscriptionsDropdown(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SUBSCRIPTIONS_DROPDOWN);
  }

  get markAllAsReadButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MARK_ALL_AS_READ_BUTTON);
  }

  get notificationsList(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NOTIFICATIONS_LIST);
  }

  async clickBackButton(): Promise<void> {
    await this.navigationButtonBack.waitForClickable();
    await this.navigationButtonBack.click();
  }

  async clickSubscriptionsDropdown(): Promise<void> {
    await this.subscriptionsDropdown.waitForClickable();
    await this.subscriptionsDropdown.click();
  }

  async clickMarkAllAsReadButton(): Promise<void> {
    await this.markAllAsReadButton.waitForClickable();
    await this.markAllAsReadButton.click();
  }

  async getCounterValue(): Promise<number> {
    const counterText = await this.sectionTitleCounter.getText();
    return Number(counterText.replace(/[()]/g, ''));
  }

  async getNotification(index: number): Promise<NotificationListItem> {
    return new NotificationListItem('page', index);
  }

  async clickOnNotification(index: number): Promise<void> {
    const notification = await this.getNotification(index);
    await notification.container.scrollIntoView();
    await notification.click();
  }
}

export default new NotificationCenter();
