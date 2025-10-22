import NotificationDetails from '../../elements/notifications/NotificationDetails';
import { expect } from 'chai';
import { t } from '../../utils/translationService';
import { NotificationDetailsContent } from '../../data/TestNotificationDetails';

class NotificationDetailsAssert {
  async assertSeeNotificationDetails(mode: 'popup' | 'extended', expectedDetails: NotificationDetailsContent) {
    await NotificationDetails.backButton.waitForDisplayed();
    await NotificationDetails.removeButton.waitForDisplayed();
    expect(await NotificationDetails.removeButton.getText()).to.equal(
      await t('notificationsCenter.removeNotification.confirm')
    );
    await NotificationDetails.viewAllButton.waitForDisplayed();
    expect(await NotificationDetails.viewAllButton.getText()).to.equal(
      mode === 'popup'
        ? await t('notificationsCenter.viewAll')
        : await t('notificationsCenter.notificationDetails.viewAll')
    );
    await NotificationDetails.title.waitForDisplayed();
    await NotificationDetails.publisher.waitForDisplayed();
    await NotificationDetails.text.waitForDisplayed();
    expect(await NotificationDetails.title.getText()).to.equal(expectedDetails.title);
    expect(await NotificationDetails.publisher.getText()).to.equal(expectedDetails.publisher);
    expect(await NotificationDetails.text.getText()).to.equal(expectedDetails.text);
  }
}

export default new NotificationDetailsAssert();
