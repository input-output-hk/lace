import { Then, When } from '@cucumber/cucumber';
import topNavigationAssert from '../assert/topNavigationAssert';
import NotificationsMenuAssert from '../assert/notifications/NotificationsMenuAssert';
import NotificationCenterAssert from '../assert/notifications/NotificationCenterAssert';
import NotificationDetailsAssert from '../assert/notifications/NotificationDetailsAssert';
import RemoveNotificationModalAssert from '../assert/notifications/RemoveNotificationModalAssert';
import NotificationsMenu from '../elements/notifications/NotificationsMenu';
import NotificationCenter from '../elements/notifications/NotificationCenter';
import NotificationDetails from '../elements/notifications/NotificationDetails';
import RemoveNotificationModal from '../elements/notifications/RemoveNotificationModal';
import NotificationListItem from '../elements/notifications/NotificationListItem';
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
  /^I click on "(View all|Mark all as read|Manage subscriptions)" button in the "Notifications menu"$/,
  async (button: 'View all' | 'Mark all as read' | 'Manage subscriptions') => {
    await NotificationsMenu.clickOnButton(button);
  }
);

When(
  /^I click on "(View all|Remove|Back)" button in the Notification details view$/,
  async (button: 'View all' | 'Remove' | 'Back') => {
    switch (button) {
      case 'View all':
        await NotificationDetails.clickViewAllButton();
        break;
      case 'Remove':
        await NotificationDetails.clickRemoveButton();
        break;
      case 'Back':
        await NotificationDetails.clickBackButton();
        break;
      default:
        throw new Error(`Unsupported button name: ${button}`);
    }
  }
);

When(
  /^I click on notification number (\d) in the "Notifications (menu|center)"$/,
  async (notificationIndex: number, location: 'menu' | 'center') => {
    await (location === 'menu'
      ? NotificationsMenu.clickOnNotification(notificationIndex)
      : NotificationCenter.clickOnNotification(notificationIndex));
  }
);

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
  /^the dynamically added notification (is|is not) displayed in the "Notifications (menu|center)" with (unread|read) marker$/,
  async (shouldBeDisplayed: 'is' | 'is not', where: 'menu' | 'center', readStatus: 'unread' | 'read') => {
    const topic = TEST_TOPICS.find((t) => t.id === DYNAMIC_NOTIFICATION.message.topicId);
    const location = where === 'menu' ? 'menu' : 'page';
    const isRead = readStatus === 'read';

    await NotificationCenterAssert.waitForNonEmptyNotification(location);
    await NotificationCenterAssert.assertSeeFirstUnreadNotificationWithTopicAndTitle(
      topic?.name || '',
      DYNAMIC_NOTIFICATION.message.title,
      location,
      shouldBeDisplayed === 'is',
      isRead
    );
  }
);

Then(/^"Notification center" is displayed in (popup|extended) mode$/, async (mode: 'popup' | 'extended') => {
  await NotificationCenterAssert.assertSeeNotificationCenter(mode);
});

Then(
  /^"Notifications (menu|page)" contains (\d+) unread notifications with all details$/,
  async (location: 'menu' | 'page', expectedCount: number) => {
    await NotificationCenterAssert.assertSeeExpectedNumberOfUnreadNotifications(expectedCount, location);
  }
);

Then(
  /^the dynamically added notification details are displayed in (popup|extended) mode$/,
  async (mode: 'popup' | 'extended') => {
    await NotificationDetailsAssert.assertSeeNotificationHeader(mode);
    await NotificationDetailsAssert.assertNotificationDetailsContent(
      DYNAMIC_NOTIFICATION.message.title,
      DYNAMIC_NOTIFICATION.message.publisher,
      DYNAMIC_NOTIFICATION.message.body
    );
  }
);

When(
  /^I click on remove button for notification number (\d+) in the "Notifications (menu|center)"$/,
  async (index: number, location: 'menu' | 'center') => {
    const notification = new NotificationListItem(location === 'menu' ? 'menu' : 'page', index);
    await notification.clickOnRemoveButton();
  }
);

When(/^I click on remove button in the Notification details view$/, async () => {
  await NotificationDetails.clickRemoveButton();
});

Then(/^Remove notification modal is displayed$/, async () => {
  await RemoveNotificationModalAssert.assertSeeRemoveNotificationModal();
});

When(/^I click "(Cancel|Remove)" button in the remove notification modal$/, async (button: 'Cancel' | 'Remove') => {
  await (button === 'Cancel' ? RemoveNotificationModal.clickCancel() : RemoveNotificationModal.clickConfirm());
  await browser.pause(1000); // small delay to give some time for removal to complete
});
