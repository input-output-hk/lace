import NotificationDetails from '../../elements/notifications/NotificationDetails';
import { expect } from 'chai';
import { t } from '../../utils/translationService';

class NotificationDetailsAssert {
  async assertSeeNotificationHeader(mode: 'popup' | 'extended') {
    await NotificationDetails.navigationButtonArrow.waitForDisplayed();

    await NotificationDetails.removeButton.waitForDisplayed();
    expect(await NotificationDetails.removeButton.getText()).to.equal(
      await t('notificationsCenter.notificationListItem.remove')
    );

    const translationKey =
      mode === 'extended' ? 'notificationsCenter.notificationDetails.viewAll' : 'notificationsCenter.viewAll';
    await NotificationDetails.viewAllButton.waitForDisplayed();
    expect(await NotificationDetails.viewAllButton.getText()).to.equal(await t(translationKey));
  }

  async assertNotificationDetailsContent(expectedTitle: string, expectedPublisher: string, expectedBody: string) {
    const actualTitle = await NotificationDetails.getTitle();
    expect(actualTitle).to.equal(expectedTitle);

    const actualPublisher = await NotificationDetails.getPublisher();
    expect(actualPublisher).to.equal(expectedPublisher);

    const actualBody = await NotificationDetails.getBody();
    expect(actualBody).to.equal(expectedBody);
  }
}

export default new NotificationDetailsAssert();
