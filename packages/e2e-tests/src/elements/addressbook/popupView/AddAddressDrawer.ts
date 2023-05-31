import CommonDrawerElements from '../../CommonDrawerElements';

class AddAddressDrawer extends CommonDrawerElements {
  private SAVE_ADDRESS_BUTTON = '[data-testid="address-form-button-save"]';
  private CANCEL_BUTTON = '[data-testid="address-form-button-cancel"]';

  get saveAddressButton() {
    return $(this.SAVE_ADDRESS_BUTTON);
  }

  get cancelButton() {
    return $(this.CANCEL_BUTTON);
  }
}

export default new AddAddressDrawer();
