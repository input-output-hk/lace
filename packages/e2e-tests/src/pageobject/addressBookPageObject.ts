import webTester from '../actor/webTester';
import { Button } from '../elements/button';
import { t } from '../utils/translationService';

class AddressBookPageObject {
  ADD_ADDRESS_BUTTON = new Button('Add address');

  async clickAddAddressButton() {
    await webTester.clickElement(this.ADD_ADDRESS_BUTTON);
  }

  async delete() {
    await webTester.clickOnElement('[data-testid=delete]');
  }

  async save() {
    await webTester.clickButton(await t('core.editAddressForm.doneButton'));
  }
}

export default new AddressBookPageObject();
