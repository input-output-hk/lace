import { expect, use } from 'chai';
import { t } from '../../utils/translationService';
import chaiString from 'chai-string';
import ReviewAddressDrawer from '../../elements/addressbook/ReviewAddressDrawer';
import ModalAssert from '../modalAssert';

use(chaiString);

class ReviewAddressDrawerAssert {
  async assertSeeReviewAddressDrawer(mode: 'extended' | 'popup', handle: string, prevAddr: string, newAddr: string) {
    await ReviewAddressDrawer.drawerHeaderCloseButton.waitForClickable({ reverse: mode === 'popup' });
    await ReviewAddressDrawer.drawerNavigationTitle.waitForDisplayed({ reverse: mode === 'popup' });
    if (mode === 'extended') {
      expect(await ReviewAddressDrawer.drawerNavigationTitle.getText()).to.equal(await t('browserView.assets.send'));
    }
    await ReviewAddressDrawer.drawerHeaderTitle.waitForDisplayed();
    expect(await ReviewAddressDrawer.drawerHeaderTitle.getText()).to.equal(
      (await t('addressBook.reviewModal.title')).replace('{{name}}', handle)
    );

    await ReviewAddressDrawer.previousAddressTitle.waitForDisplayed();
    expect(await ReviewAddressDrawer.previousAddressTitle.getText()).to.equal(
      await t('addressBook.reviewModal.previousAddress.description')
    );

    await ReviewAddressDrawer.previousAddressValue.waitForDisplayed();
    expect(await ReviewAddressDrawer.previousAddressValue.getText()).to.startsWith(prevAddr.slice(0, 25));
    expect(await ReviewAddressDrawer.previousAddressValue.getText()).to.endsWith(prevAddr.slice(prevAddr.length, -25));

    await ReviewAddressDrawer.previousAddressCopyButton.waitForDisplayed();
    expect(await ReviewAddressDrawer.previousAddressCopyButton.getText()).to.equal(
      await t('addressBook.addressDetail.btn.copy')
    );

    await ReviewAddressDrawer.newAddressTitle.waitForDisplayed();
    expect(await ReviewAddressDrawer.newAddressTitle.getText()).to.equal(
      await t('addressBook.reviewModal.actualAddress.description')
    );

    await ReviewAddressDrawer.newAddressValue.waitForDisplayed();
    expect(await ReviewAddressDrawer.newAddressValue.getText()).to.startsWith(newAddr.slice(0, 25));
    expect(await ReviewAddressDrawer.newAddressValue.getText()).to.endsWith(newAddr.slice(newAddr.length, -25));

    await ReviewAddressDrawer.newAddressCopyButton.waitForDisplayed();
    expect(await ReviewAddressDrawer.newAddressCopyButton.getText()).to.equal(
      await t('addressBook.addressDetail.btn.copy')
    );
  }

  async assertSeeAreYouSureReviewModal(shouldSee: boolean) {
    await ModalAssert.assertSeeModalContainer(shouldSee);
    if (shouldSee) {
      const title = await t('addressBook.updateModal.title');
      const description = await t('addressBook.updateModal.description');
      const cancelButtonLabel = await t('general.button.cancel');
      const confirmButtonLabel = await t('addressBook.updateModal.button.confirm');
      await ModalAssert.assertSeeModal(title, description, cancelButtonLabel, confirmButtonLabel);
    }
  }
}

export default new ReviewAddressDrawerAssert();
