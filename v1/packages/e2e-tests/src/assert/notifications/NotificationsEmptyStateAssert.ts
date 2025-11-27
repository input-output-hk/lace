import NotificationsEmptyState from '../../elements/notifications/NotificationsEmptyState';
import { expect } from 'chai';
import { t } from '../../utils/translationService';

class NotificationsEmptyStateAssert {
  async assertSeeEmptyState(location: 'menu' | 'page') {
    const emptyState = new NotificationsEmptyState(location);

    await emptyState.emptyStateImage.waitForDisplayed();

    await emptyState.emptyStateTitle.waitForDisplayed();
    expect(await emptyState.getTitle()).to.equal(await t('notificationsCenter.emptyState.title'));

    await emptyState.emptyStateDescription.waitForDisplayed();
    expect(await emptyState.getDescription()).to.equal(await t('notificationsCenter.emptyState.description'));
  }
}

export default new NotificationsEmptyStateAssert();
