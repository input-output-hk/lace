/* global WebdriverIO */
import CommonDrawerElements from '../CommonDrawerElements';
import AddressForm from './AddressForm';
import type { ChainablePromiseElement } from 'webdriverio';

class AddNewAddressDrawer extends CommonDrawerElements {
  private SAVE_ADDRESS_BUTTON = '[data-testid="address-form-button-save"]';
  private CANCEL_BUTTON = '[data-testid="address-form-button-cancel"]';

  get addressForm(): typeof AddressForm {
    return AddressForm;
  }

  get saveAddressButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SAVE_ADDRESS_BUTTON);
  }

  get cancelButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CANCEL_BUTTON);
  }

  async clickOnSaveAddressButton() {
    await this.saveAddressButton.waitForClickable();
    await this.saveAddressButton.click();
  }

  async clickOnCancelButton() {
    await this.cancelButton.waitForClickable();
    await this.cancelButton.click();
  }
}

export default new AddNewAddressDrawer();
