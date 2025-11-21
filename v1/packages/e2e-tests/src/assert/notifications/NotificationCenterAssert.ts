import NotificationCenter from '../../elements/notifications/NotificationCenter';
import { expect } from 'chai';
import { t } from '../../utils/translationService';
import NotificationListItem from '../../elements/notifications/NotificationListItem';

class NotificationCenterAssert {
  async assertSeeNotificationCenter(mode: 'popup' | 'extended') {
    await NotificationCenter.navigationButtonBack.waitForDisplayed();

    await NotificationCenter.sectionTitle.waitForDisplayed();
    expect(await NotificationCenter.sectionTitle.getText()).to.equal(await t('notificationsCenter.title'));

    await NotificationCenter.sectionTitleCounter.waitForDisplayed();
    expect(await NotificationCenter.getCounterValue()).to.be.greaterThan(0);

    await NotificationCenter.subscriptionsButton.waitForDisplayed();
    expect(await NotificationCenter.subscriptionsButton.getText()).to.equal(
      await t('notificationsCenter.subscriptions')
    );
    if (mode === 'extended') {
      await NotificationCenter.markAllAsReadButton.waitForDisplayed();
      expect(await NotificationCenter.markAllAsReadButton.getText()).to.equal(
        await t('notificationsCenter.markAllAsRead')
      );
    }

    await NotificationCenter.notificationsList.waitForDisplayed();
  }

  async assertSeeFirstUnreadNotificationWithTopicAndTitle(
    expectedTopic: string,
    expectedTitle: string,
    location: 'menu' | 'page',
    isDisplayed = true,
    isRead = false
  ) {
    if (!isDisplayed) {
      const notificationCount = await NotificationListItem.getNotificationCount(location);

      for (let i = 1; i <= notificationCount; i++) {
        const notification = new NotificationListItem(location, i);
        const actualTopic = await notification.getPublisher();
        const actualTitle = await notification.getTitle();

        // Assert that no notification matches both topic and title
        const matches = actualTopic === expectedTopic && actualTitle === expectedTitle;
        expect(matches).to.be.false;
      }
    } else {
      // Notification should exist and be displayed
      const firstNotification = new NotificationListItem(location, 1);

      if (isRead) {
        expect(await firstNotification.isUnread()).to.be.false;
      } else {
        await firstNotification.dot.waitForDisplayed();
        expect(await firstNotification.isUnread()).to.be.true;
      }

      const actualTopic = await firstNotification.getPublisher();
      expect(actualTopic).to.equal(expectedTopic);

      const actualTitle = await firstNotification.getTitle();
      expect(actualTitle).to.equal(expectedTitle);
    }
  }

  async assertSeeExpectedNumberOfNotifications(
    expectedCount: number,
    location: 'menu' | 'page',
    status: 'read' | 'unread'
  ) {
    for (let i = 1; i <= expectedCount; i++) {
      const notification = new NotificationListItem(location, i);
      await notification.title.waitForDisplayed();
      const title = await notification.getTitle();
      expect(title).to.not.be.empty;

      await notification.publisher.waitForDisplayed();
      const publisher = await notification.getPublisher();
      expect(publisher).to.not.be.empty;

      const isUnread = await notification.isUnread();
      expect(isUnread).to.equal(status === 'unread');
    }
  }

  async waitForNonEmptyNotification(location: 'menu' | 'page', index = 1): Promise<void> {
    const notification = new NotificationListItem(location, index);
    await notification.container.waitForDisplayed();

    await browser.waitUntil(
      async () => {
        const title = await notification.getTitle();
        const publisher = await notification.getPublisher();
        return title.length > 0 && publisher.length > 0;
      },
      {
        timeout: 1000,
        timeoutMsg: `Notification at location '${location}' (index ${index}) did not have non-empty text within timeout`
      }
    );
  }

  async assertSeeMarkAllAsReadButton(shouldSee: boolean) {
    await NotificationCenter.markAllAsReadButton.waitForDisplayed({ reverse: !shouldSee });
  }
}

export default new NotificationCenterAssert();
