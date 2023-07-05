import { AddressAddNew } from '../../elements/addressbook/extendedview/AddressAddNew';
import { t } from '../../utils/translationService';
import { expect } from 'chai';
import AddAddressDrawer from '../../elements/addressbook/popupView/AddAddressDrawer';
import AddressFormAssert from './AddressFormAssert';

class AddressAddNewExtendedAssert {
  async assertSeeAddNewAddressFormInSendFlow() {
    await AddAddressDrawer.drawerHeaderTitle.waitForDisplayed();
    await expect(await AddAddressDrawer.drawerHeaderTitle.getText()).to.equal(
      await t('browserView.transaction.send.drawer.addressForm')
    );
    await AddressFormAssert.assertSeeAddressFormInputs();
    await AddAddressDrawer.saveAddressButton.waitForDisplayed();
    await expect(await AddAddressDrawer.saveAddressButton.getText()).to.equal(
      await t('core.editAddressForm.doneButton')
    );
    await AddAddressDrawer.cancelButton.waitForDisplayed();
    await expect(await AddAddressDrawer.cancelButton.getText()).to.equal(await t('core.general.cancelButton'));
  }

  async assertSeeAddressInAddressInput(inDrawer: boolean, expectedAddress: string) {
    const addressAddNew = new AddressAddNew(inDrawer);
    const currenAddress = await addressAddNew.getAddressInputValue();
    await expect(currenAddress).to.equal(expectedAddress);
  }
}

export default new AddressAddNewExtendedAssert();
