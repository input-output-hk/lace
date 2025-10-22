import { Then, When } from '@cucumber/cucumber';
import topNavigationAssert from '../assert/topNavigationAssert';
import NotificationsMenuAssert from '../assert/notifications/NotificationsMenuAssert';
import NotificationsMenu from '../elements/notifications/NotificationsMenu';
import NotificationDetailsAssert from '../assert/notifications/NotificationDetailsAssert';
import { getNotificationDetailsByTitle } from '../data/TestNotificationDetails';
import NotificationDetails from '../elements/notifications/NotificationDetails';

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

Then(
  /^The "([^"]*)" notification details are displayed in (extended|popup) mode$/,
  async (notificationTitle: string, mode: 'extended' | 'popup') => {
    const expectedNotificationDetails = getNotificationDetailsByTitle(notificationTitle);
    await NotificationDetailsAssert.assertSeeNotificationDetails(mode, expectedNotificationDetails);
  }
);

When(
  /^I click on the "(Back|Remove|View all|View all notifications)" button on the notification details page$/,
  async (button: 'Back' | 'Remove' | 'View all' | 'View all notifications') => {
    await NotificationDetails.clickOnButton(button);
  }
);
