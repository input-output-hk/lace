import { Page } from '@playwright/test';

import { convertToUTC } from './../utils/helperFunctions';
import { ActivityItem, ActivityItemElement } from './components/activityItem';
import { LaceBasePage } from './laceBasePage';

export class LaceActivityPage extends LaceBasePage {
  readonly lastActivityItem: ActivityItemElement;
  constructor(page: Page) {
    super(page);
    this.lastActivityItem = new ActivityItemElement(
      this.page,
      this.page.locator(
        '(//div[@data-testid="grouped-asset-activity-list"]//div[@data-testid="asset-activity-item"])[1]'
      )
    );
  }

  async goto(): Promise<LaceActivityPage> {
    const baseUrl = this.getBaseUrlFromCurrentUrl();
    await this.page.goto(`${baseUrl}/activity`);
    return new LaceActivityPage(this.page);
  }

  async getTopActivityItem(): Promise<ActivityItem> {
    await this.waitForNewActivityItem();
    const activityItemElement = new ActivityItemElement(
      this.page,
      this.page.locator(
        '(//div[@data-testid="grouped-asset-activity-list"]//div[@data-testid="asset-activity-item"])[1]'
      )
    );
    return await activityItemElement.getActivityItemValues();
  }

  async waitForNewActivityItem(): Promise<void> {
    const WAIT_TIME_IN_SEC = 60;
    const MILISECONDS = 1000;
    const stopTime = new Date(Date.now() + WAIT_TIME_IN_SEC * MILISECONDS);
    while (Date.now() < stopTime.getTime()) {
      const activityItemValues = await this.lastActivityItem.getActivityItemValues();
      if (activityItemValues.time < convertToUTC(new Date(Date.now()))) {
        return;
      }
      await this.page.waitForTimeout(MILISECONDS);
    }
    throw new Error(`No activity item found after ${WAIT_TIME_IN_SEC} seconds`);
  }
}
