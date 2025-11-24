/* global WebdriverIO */
import AddressForm from './AddressForm';
import CommonDrawerElements from '../CommonDrawerElements';
import type { ChainablePromiseElement } from 'webdriverio';

class EditAddressDrawer extends CommonDrawerElements {
  private DONE_BUTTON = '[data-testid="address-form-button-save"]';
  private CANCEL_BUTTON = '[data-testid="address-form-button-cancel"]';

  get addressForm(): typeof AddressForm {
    return AddressForm;
  }

  get doneButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DONE_BUTTON);
  }

  get cancelButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CANCEL_BUTTON);
  }

  async clickOnCancelButton() {
    await this.cancelButton.waitForClickable();
    await this.cancelButton.click();
  }

  async clickOnDoneButton() {
    await this.doneButton.waitForClickable();
    await this.doneButton.click();
  }
}

export default new EditAddressDrawer();
