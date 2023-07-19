import AddressDetails from '../../elements/addressbook/AddressDetails';
import { t } from '../../utils/translationService';
import { expect } from 'chai';

class AddressDetailsAssert {
  assertSeeAddressDetailsPage = async (shouldSee: boolean, mode: 'extended' | 'popup') => {
    if (shouldSee) {
      await AddressDetails.drawerNavigationTitle.waitForDisplayed({ reverse: mode === 'popup' });
      await AddressDetails.drawerHeaderCloseButton.waitForDisplayed({ reverse: mode === 'popup' });
      await AddressDetails.drawerHeaderBackButton.waitForDisplayed({ reverse: mode === 'extended' });
      if (mode === 'extended') {
        await expect(await AddressDetails.drawerNavigationTitle.getText()).to.equal(
          await t('browserView.addressBook.title')
        );
      }
      await AddressDetails.drawerHeaderTitle.waitForDisplayed();
      await expect(await AddressDetails.drawerHeaderTitle.getText()).to.equal(
        await t('browserView.addressBook.addressDetail.title')
      );
      await AddressDetails.name.waitForDisplayed();
      await AddressDetails.address.waitForDisplayed();
      await AddressDetails.copyButton.waitForDisplayed();
      await expect(await AddressDetails.copyButton.getText()).to.equal(await t('addressBook.addressDetail.btn.copy'));
      await AddressDetails.editButton.waitForDisplayed();
      await expect(await AddressDetails.editButton.getText()).to.equal(
        await t('browserView.addressBook.addressDetail.btn.edit')
      );
      await AddressDetails.deleteButton.waitForDisplayed();
      await expect(await AddressDetails.deleteButton.getText()).to.equal(
        await t('browserView.addressBook.addressDetail.btn.delete')
      );
    } else {
      await AddressDetails.container.waitForDisplayed({ reverse: true });
    }
  };
}

export default new AddressDetailsAssert();
