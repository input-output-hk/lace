/* global WebdriverIO */
import type { ChainablePromiseElement } from 'webdriverio';

class NotificationDetails {
  private readonly NAVIGATION_BUTTON_ARROW = '[data-testid="navigation-button-arrow"]';
  private readonly REMOVE_BUTTON = '[data-testid="remove-button"]';
  private readonly VIEW_ALL_BUTTON = '[data-testid="view-all-button"]';
  private readonly NOTIFICATION_TITLE = '[data-testid="notification-details-title"]';
  private readonly NOTIFICATION_TOPIC_NAME = '[data-testid="notification-details-topic-name"]';
  private readonly NOTIFICATION_BODY = '[data-testid="notification-details-body"]';

  get navigationButtonArrow(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NAVIGATION_BUTTON_ARROW);
  }

  get removeButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.REMOVE_BUTTON);
  }

  get viewAllButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.VIEW_ALL_BUTTON);
  }

  get notificationTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NOTIFICATION_TITLE);
  }

  get notificationTopicName(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NOTIFICATION_TOPIC_NAME);
  }

  get notificationBody(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NOTIFICATION_BODY);
  }

  async clickBackButton(): Promise<void> {
    await this.navigationButtonArrow.waitForClickable();
    await this.navigationButtonArrow.click();
  }

  async clickRemoveButton(): Promise<void> {
    await this.removeButton.waitForClickable();
    await this.removeButton.click();
  }

  async clickViewAllButton(): Promise<void> {
    await this.viewAllButton.waitForClickable();
    await this.viewAllButton.click();
  }

  async getTitle(): Promise<string> {
    return await this.notificationTitle.getText();
  }

  async getTopicName(): Promise<string> {
    return await this.notificationTopicName.getText();
  }

  async getBody(): Promise<string> {
    return await this.notificationBody.getText();
  }
}

export default new NotificationDetails();
