import { Then, When } from '@cucumber/cucumber';
import topNavigationAssert from '../assert/topNavigationAssert';
import NotificationsMenuAssert from '../assert/notifications/NotificationsMenuAssert';
import NotificationCenterAssert from '../assert/notifications/NotificationCenterAssert';
import NotificationsMenu from '../elements/notifications/NotificationsMenu';
import { NotificationsManager, Topic, Notification } from '../utils/NotificationsManager';

const TEST_TOPICS: Topic[] = [
  { id: 'topic-1', name: 'System Updates', subscribed: true },
  { id: 'topic-2', name: 'Transaction Alerts', subscribed: true }
];

const TEST_NOTIFICATIONS: Notification[] = [
  {
    message: {
      id: 'notif-1',
      title: 'Welcome to Lace',
      body: 'Your wallet is ready to use',
      publisher: 'lace-team',
      chain: 'preprod',
      format: 'plain',
      topicId: 'topic-1'
    }
  },
  {
    message: {
      id: 'notif-2',
      title: 'Security Update',
      body: 'New security features available',
      publisher: 'lace-team',
      chain: 'preprod',
      format: 'plain',
      topicId: 'topic-1'
    }
  }
];

const DYNAMIC_NOTIFICATION: Notification = {
  message: {
    id: 'notif-3',
    title: 'Transaction Confirmed',
    body: 'Your transaction has been confirmed',
    publisher: 'lace-team',
    chain: 'preprod',
    format: 'plain',
    topicId: 'topic-2'
  }
};

Then(
  /^"Notifications" button indicates (\d) unread notifications$/,
  async (unreadCount: number) => await topNavigationAssert.assertSeeUnreadNotificationsCounter(unreadCount)
);

Then(
  /^"Notifications menu" is displayed with (all read|some unread) messages$/,
  async (messagesStatus: 'all read' | 'some unread' | 'no') => {
    await NotificationsMenuAssert.assertSeeNotificationsMenu(messagesStatus);
  }
);

When(
  /^I click on "(View all|Mark all as read|Manage subscriptions)" button on the "Notifications menu"$/,
  async (button: 'View all' | 'Mark all as read' | 'Manage subscriptions') => {
    await NotificationsMenu.clickOnButton(button);
  }
);

When(/^I click on notification number (\d) on the "Notifications menu"$/, async (notificationIndex: number) => {
  await NotificationsMenu.clickOnNotification(notificationIndex);
});

When(/^I inject the notification center script into browser$/, async () => {
  await NotificationsManager.inject();
});

When(/^I initialize notification center with test topics and notifications$/, async () => {
  await NotificationsManager.init(TEST_TOPICS, TEST_NOTIFICATIONS);
});

When(/^I add a new notification dynamically$/, async () => {
  await NotificationsManager.add(DYNAMIC_NOTIFICATION);
});

Then(
  /^the dynamically added notification (is|is not) displayed in the (menu|notification center) with (unread|read) marker$/,
  async (shouldBeDisplayed: 'is' | 'is not', where: 'menu' | 'notification center', readStatus: 'unread' | 'read') => {
    const topic = TEST_TOPICS.find((t) => t.id === DYNAMIC_NOTIFICATION.message.topicId);
    const location = where === 'menu' ? 'menu' : 'page';
    const isRead = readStatus === 'read';

    await NotificationCenterAssert.assertSeeFirstUnreadNotificationWithTopicAndTitle(
      topic?.name || '',
      DYNAMIC_NOTIFICATION.message.title,
      location,
      shouldBeDisplayed === 'is',
      isRead
    );
  }
);

Then(/^"Notification Center" is displayed in (popup|extended) mode$/, async (mode: 'popup' | 'extended') => {
  await NotificationCenterAssert.assertSeeNotificationCenter(mode);
});

Then(
  /^Notifications (menu|page) contains (\d+) unread notifications with all details$/,
  async (location: 'menu' | 'page', expectedCount: number) => {
    await NotificationCenterAssert.assertSeeExpectedNumberOfUnreadNotifications(expectedCount, location);
  }
);
