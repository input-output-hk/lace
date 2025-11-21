import EditAddressDrawer from '../../elements/addressbook/EditAddressDrawer';
import { expect } from 'chai';
import { t } from '../../utils/translationService';
import AddressFormAssert from './AddressFormAssert';
import { Address } from '../../data/Address';

class EditAddressDrawerAssert {
  async assertSeeEditAddressDrawer(mode: 'extended' | 'popup', expectedAddress: Address) {
    await EditAddressDrawer.drawerHeaderBackButton.waitForClickable();
    await EditAddressDrawer.drawerHeaderCloseButton.waitForClickable({ reverse: mode === 'popup' });
    await EditAddressDrawer.drawerNavigationTitle.waitForDisplayed({ reverse: mode === 'popup' });
    if (mode === 'extended') {
      expect(await EditAddressDrawer.drawerNavigationTitle.getText()).to.equal(
        await t('browserView.addressBook.title')
      );
    }
    await EditAddressDrawer.drawerHeaderTitle.waitForDisplayed();
    expect(await EditAddressDrawer.drawerHeaderTitle.getText()).to.equal(
      await t('browserView.addressBook.editAddress.title')
    );

    await AddressFormAssert.assertSeeAddressFormInputsPopulated(expectedAddress);

    await EditAddressDrawer.doneButton.waitForDisplayed();
    expect(await EditAddressDrawer.doneButton.getText()).to.equal(await t('core.editAddressForm.doneButton'));
    await EditAddressDrawer.cancelButton.waitForDisplayed();
    expect(await EditAddressDrawer.cancelButton.getText()).to.equal(await t('core.general.cancelButton'));
  }

  async assertDoneButtonEnabled(shouldBeEnabled: boolean) {
    await EditAddressDrawer.doneButton.waitForEnabled({ reverse: !shouldBeEnabled });
  }
}

export default new EditAddressDrawerAssert();
