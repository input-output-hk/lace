import { Then } from '@cucumber/cucumber';
import topNavigationAssert from '../assert/topNavigationAssert';

Then(
  /^"Notifications" button indicates (\d) unread notifications$/,
  async (unreadCount: number) => await topNavigationAssert.assertSeeUnreadNotificationsCounter(unreadCount)
);
