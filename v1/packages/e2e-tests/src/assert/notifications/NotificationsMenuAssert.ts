import NotificationsMenu from '../../elements/notifications/NotificationsMenu';
import { expect } from 'chai';
import { t } from '../../utils/translationService';
import NotificationListItem from '../../elements/notifications/NotificationListItem';

class NotificationsMenuAssert {
  async assertSeeNotificationsMenu(notificationsStatus: 'all read' | 'some unread' | 'no') {
    await NotificationsMenu.notificationsMenuComponent.waitForDisplayed();
    await NotificationsMenu.notificationsList.waitForDisplayed({ reverse: notificationsStatus === 'no' });

    await NotificationsMenu.viewAllButton.waitForDisplayed();
    expect(await NotificationsMenu.viewAllButton.getText()).to.equal(
      await t(`notificationsCenter.${notificationsStatus === 'no' ? 'manageSubscriptions' : 'viewAll'}`)
    );
    await NotificationsMenu.markAllAsReadButton.waitForDisplayed({ reverse: notificationsStatus === 'no' });

    const notificationStatest = await this.getNotificationStates();
    if (notificationsStatus === 'some unread') {
      expect(await NotificationsMenu.markAllAsReadButton.getText()).to.equal(
        await t('notificationsCenter.markAllAsRead')
      );
      expect(notificationStatest.unreadCount).to.be.greaterThan(0);
    }
    if (notificationsStatus === 'all read') {
      const totalNotifications = await NotificationListItem.getNotificationCount('menu');
      expect(notificationStatest.readCount).to.be.equal(totalNotifications);
    }
  }

  private async getNotificationStates() {
    const notificationsCount = await NotificationListItem.getNotificationCount('menu');
    let unreadCount = 0;
    let readCount = 0;
    for (let i = 1; i <= notificationsCount; i++) {
      const notification = new NotificationListItem('menu', i);
      if (await notification.isUnread()) {
        unreadCount++;
      } else {
        readCount++;
      }
    }

    return { unreadCount, readCount };
  }

  async assertSeeMarkAllAsReadButton(shouldSee: boolean) {
    await NotificationsMenu.markAllAsReadButton.waitForDisplayed({ reverse: !shouldSee });
  }
}

export default new NotificationsMenuAssert();
