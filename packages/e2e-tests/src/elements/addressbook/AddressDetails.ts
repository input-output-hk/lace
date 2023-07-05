import CommonDrawerElements from '../CommonDrawerElements';

class AddressDetails extends CommonDrawerElements {
  private ADDRESS_DETAILS_CONTAINER = '[data-testid="address-form-details-container"]';
  private NAME = '[data-testid="address-form-details-name"]';
  private ADDRESS = '[data-testid="address-form-details-address"]';
  private COPY_BUTTON = '[data-testid="address-form-details-copy"]';
  private EDIT_BUTTON = '[data-testid="address-form-details-btn-edit"]';
  private DELETE_BUTTON = '[data-testid="address-form-details-btn-delete"]';

  get container() {
    return $(this.ADDRESS_DETAILS_CONTAINER);
  }

  get name() {
    return $(this.NAME);
  }

  get address() {
    return $(this.ADDRESS);
  }

  get copyButton() {
    return $(this.COPY_BUTTON);
  }

  get editButton() {
    return $(this.EDIT_BUTTON);
  }

  get deleteButton() {
    return $(this.DELETE_BUTTON);
  }
}

export default new AddressDetails();
