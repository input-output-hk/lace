import SubscriptionsDropdown from '../../elements/notifications/SubscriptionsDropdown';
import { expect } from 'chai';
import { t } from '../../utils/translationService';

class SubscriptionsDropdownAssert {
  async assertSeeSubscriptionsDropdown() {
    await SubscriptionsDropdown.dropdownMenu.waitForDisplayed();

    await SubscriptionsDropdown.dropdownDescription.waitForDisplayed();
    expect(await SubscriptionsDropdown.getDropdownDescriptionText()).to.equal(
      await t('notificationsCenter.chooseSubject')
    );
  }

  async assertTopicSubscriptionState(topicId: string, shouldBeSubscribed: boolean) {
    const isSubscribed = await SubscriptionsDropdown.isTopicSubscribed(topicId);
    expect(isSubscribed).to.equal(shouldBeSubscribed);
  }
}

export default new SubscriptionsDropdownAssert();
