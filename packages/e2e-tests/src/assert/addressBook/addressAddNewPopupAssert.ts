import { AddressAddNew } from '../../elements/addressbook/extendedview/AddressAddNew';
import { t } from '../../utils/translationService';
import { expect } from 'chai';
import { DrawerCommonExtended } from '../../elements/drawerCommonExtended';
import AddAddressDrawer from '../../elements/addressbook/popupView/AddAddressDrawer';

class AddressAddNewPopupAssert {
  assertSeeAddressFormInputs = async () => {
    const addressAddNew = new AddressAddNew(false);
    await $(addressAddNew.nameInput().toJSLocator()).waitForDisplayed();
    await $(addressAddNew.addressInput().toJSLocator()).waitForDisplayed();
  };

  assertSeeSaveAddressButton = async () => {
    const saveAddressButton = await AddAddressDrawer.saveAddressButton;
    await saveAddressButton.waitForDisplayed();
    expect(await saveAddressButton.getText()).to.equal(await t('browserView.addressBook.addressForm.saveAddress'));
  };

  assertSeeCancelButton = async () => {
    const cancelButton = await AddAddressDrawer.cancelButton;
    await cancelButton.waitForDisplayed();
    expect(await cancelButton.getText()).to.equal(await t('core.general.cancelButton'));
  };

  async assertSeeAddNewAddressForm() {
    const drawerCommonExtended = new DrawerCommonExtended();
    expect(await drawerCommonExtended.getTitle()).to.equal(await t('browserView.addressBook.addressForm.title.add'));
    await this.assertSeeAddressFormInputs();
    await this.assertSeeSaveAddressButton();
    await this.assertSeeCancelButton();
  }
}

export default new AddressAddNewPopupAssert();
