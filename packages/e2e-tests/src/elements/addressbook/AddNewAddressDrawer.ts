import CommonDrawerElements from '../CommonDrawerElements';
import AddressForm from './AddressForm';

class AddNewAddressDrawer extends CommonDrawerElements {
  private SAVE_ADDRESS_BUTTON = '[data-testid="address-form-button-save"]';
  private CANCEL_BUTTON = '[data-testid="address-form-button-cancel"]';

  get addressForm(): typeof AddressForm {
    return AddressForm;
  }

  get saveAddressButton() {
    return $(this.SAVE_ADDRESS_BUTTON);
  }

  get cancelButton() {
    return $(this.CANCEL_BUTTON);
  }
}

export default new AddNewAddressDrawer();
