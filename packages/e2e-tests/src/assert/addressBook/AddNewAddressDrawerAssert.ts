import AddressFormAssert from './AddressFormAssert';
import AddNewAddressDrawer from '../../elements/addressbook/AddNewAddressDrawer';
import { expect } from 'chai';
import { t } from '../../utils/translationService';

class AddNewAddressDrawerAssert {
  async assertSeeAddNewAddressDrawer(mode: 'extended' | 'popup', isSendFlow = false) {
    await AddNewAddressDrawer.drawerHeaderTitle.waitForStable();
    await AddNewAddressDrawer.drawerHeaderBackButton.waitForClickable({
      reverse: isSendFlow ? false : mode === 'extended'
    });
    // Uncomment L12-14 and remove L15-17 when LW-7399 is resolved
    // await AddNewAddressDrawer.drawerHeaderCloseButton.waitForDisplayed({
    //   reverse: mode === 'popup'
    // });
    await AddNewAddressDrawer.drawerHeaderCloseButton.waitForDisplayed({
      reverse: isSendFlow ? false : mode === 'popup'
    });
    await AddNewAddressDrawer.drawerNavigationTitle.waitForDisplayed({ reverse: mode === 'popup' });
    if (mode === 'extended') {
      const expectedTitle = isSendFlow ? await t('core.sendReceive.send') : await t('browserView.addressBook.title');
      expect(await AddNewAddressDrawer.drawerNavigationTitle.getText()).to.equal(expectedTitle);
    }

    const expectedTitle = isSendFlow
      ? await t('browserView.transaction.send.drawer.addressForm')
      : await t('browserView.addressBook.form.addNewAddress');
    expect(await AddNewAddressDrawer.drawerHeaderTitle.getText()).to.equal(expectedTitle);

    await AddressFormAssert.assertSeeAddressFormInputs();

    await AddNewAddressDrawer.saveAddressButton.waitForDisplayed();
    // TODO: update translation when LW-5866 is resolved
    const expectedSaveButtonLabel = isSendFlow
      ? await t('core.editAddressForm.doneButton')
      : await t('browserView.addressBook.addressForm.saveAddress');
    expect(await AddNewAddressDrawer.saveAddressButton.getText()).to.equal(expectedSaveButtonLabel);

    await AddNewAddressDrawer.cancelButton.waitForDisplayed();
    expect(await AddNewAddressDrawer.cancelButton.getText()).to.equal(await t('core.general.cancelButton'));
  }

  async assertSaveAddressButtonEnabled(shouldBeEnabled: boolean) {
    await AddNewAddressDrawer.saveAddressButton.waitForEnabled({ reverse: !shouldBeEnabled });
  }
}

export default new AddNewAddressDrawerAssert();
