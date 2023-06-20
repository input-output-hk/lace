import webTester from '../../actor/webTester';
import { AddressAddNew } from '../../elements/addressbook/extendedview/AddressAddNew';
import { Button } from '../../elements/button';
import { t } from '../../utils/translationService';
import { expect } from 'chai';
import AddAddressDrawer from '../../elements/addressbook/popupView/AddAddressDrawer';

class AddressAddNewExtendedAssert {
  assertSeeAddressFormInputs = async () => {
    const addressAddNew = new AddressAddNew(false);
    await webTester.seeWebElement(addressAddNew.nameInput());
    await webTester.seeWebElement(addressAddNew.addressInput());
  };

  async assertSeeAddNewAddressForm() {
    await webTester.waitUntilSeeElementContainingText(await t('browserView.addressBook.form.addNewAddress'));
    await this.assertSeeAddressFormInputs();
    await webTester.seeWebElement(new Button(await t('browserView.addressBook.addressForm.saveAddress')));
  }

  async assertSeeAddNewAddressFormInSendFlow() {
    await AddAddressDrawer.drawerHeaderTitle.waitForDisplayed();
    await expect(await AddAddressDrawer.drawerHeaderTitle.getText()).to.equal(
      await t('browserView.transaction.send.drawer.addressForm')
    );
    await this.assertSeeAddressFormInputs();
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
