import RemoveNotificationModal from '../../elements/notifications/RemoveNotificationModal';
import { expect } from 'chai';
import { t } from '../../utils/translationService';

class RemoveNotificationModalAssert {
  async assertSeeRemoveNotificationModal() {
    await RemoveNotificationModal.modalTitle.waitForDisplayed();
    expect(await RemoveNotificationModal.getTitle()).to.equal(await t('notificationsCenter.removeNotification'));

    await RemoveNotificationModal.modalDescription.waitForDisplayed();
    expect(await RemoveNotificationModal.getDescription()).to.equal(
      await t('notificationsCenter.removeNotification.description')
    );

    await RemoveNotificationModal.cancelButton.waitForDisplayed();
    expect(await RemoveNotificationModal.cancelButton.getText()).to.equal(
      await t('notificationsCenter.removeNotification.cancel')
    );

    await RemoveNotificationModal.confirmButton.waitForDisplayed();
    expect(await RemoveNotificationModal.confirmButton.getText()).to.equal(
      await t('notificationsCenter.removeNotification.confirm')
    );
  }
}

export default new RemoveNotificationModalAssert();
