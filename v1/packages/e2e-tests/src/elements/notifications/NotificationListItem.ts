/* global WebdriverIO */
import type { ChainablePromiseElement } from 'webdriverio';

class NotificationListItem {
  private readonly DOT_SELECTOR = '[data-testid="notification-list-item-dot"]';
  private readonly TITLE_SELECTOR = '[data-testid="notification-list-item-title"]';
  private readonly PUBLISHER_SELECTOR = '[data-testid="notification-list-item-publisher"]';
  private readonly REMOVE_BUTTON_SELECTOR = '[data-testid="notification-list-item-remove-button"]';

  private static readonly CONTAINER_SELECTOR = '[data-testid="notification-list-item"]';
  private static readonly ANT_DROPDOWN_MENU = '.ant-dropdown-menu';
  private static readonly PAGE_CONTENT = ':is(#content, #contentLayout)';

  private readonly index: number; // Index of the notification in the list, starting from 1 (CSS selectors in use)
  private readonly location: 'menu' | 'page';

  constructor(location: 'menu' | 'page', index = 1) {
    this.index = index;
    this.location = location;
  }

  static getAllContainersSelector(location: 'menu' | 'page'): string {
    return `${location === 'menu' ? this.ANT_DROPDOWN_MENU : this.PAGE_CONTENT} ${this.CONTAINER_SELECTOR}`;
  }

  private getContainerSelector(): string {
    return `${this.location === 'menu' ? NotificationListItem.ANT_DROPDOWN_MENU : NotificationListItem.PAGE_CONTENT} ${
      NotificationListItem.CONTAINER_SELECTOR
    }:nth-child(${this.index})`;
  }

  private getSelector(itemSelector: string): string {
    return `${this.getContainerSelector()} ${itemSelector}`;
  }

  static async getNotificationCount(location: 'menu' | 'page'): Promise<number> {
    const selector = NotificationListItem.getAllContainersSelector(location);
    return (await $$(selector)).length;
  }

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.getContainerSelector());
  }

  get dot(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.getSelector(this.DOT_SELECTOR));
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.getSelector(this.TITLE_SELECTOR));
  }

  get publisher(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.getSelector(this.PUBLISHER_SELECTOR));
  }

  // Available only on the "Notifications center" page
  get removeButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.getSelector(this.REMOVE_BUTTON_SELECTOR));
  }

  async isUnread(): Promise<boolean> {
    return await this.dot.isDisplayed();
  }

  async click(): Promise<void> {
    await this.container.waitForClickable();
    await this.container.click();
  }

  async hoverOverItem(): Promise<void> {
    await this.container.moveTo();
  }

  async clickOnRemoveButton(): Promise<void> {
    // Hover over if the location is 'page' to make the remove button visible
    if (this.location === 'page') {
      await this.hoverOverItem();
    }
    await this.removeButton.waitForClickable();
    await this.removeButton.click();
  }

  async getTitle(): Promise<string> {
    return await this.title.getText();
  }

  async getPublisher(): Promise<string> {
    return await this.publisher.getText();
  }
}

export default NotificationListItem;
