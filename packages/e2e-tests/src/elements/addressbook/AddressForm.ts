import { clearInputFieldValue, setInputFieldValue } from '../../utils/inputFieldUtils';

class AddressForm {
  private NAME_INPUT = '[data-testid="address-form-name-input"]';
  private ADDRESS_INPUT = '[data-testid="address-form-address-input"]';
  private SEARCH_INPUT = '[data-testid="search-input"]';
  private FORM_ITEM = '.ant-form-item';
  private ERROR = '[role="alert"]';

  get nameInput() {
    return $(this.NAME_INPUT);
  }

  get addressInput() {
    return $(this.ADDRESS_INPUT).$(this.SEARCH_INPUT);
  }

  get nameError() {
    return $$(this.FORM_ITEM)[0].$(this.ERROR);
  }

  get addressError() {
    return $$(this.FORM_ITEM)[1].$(this.ERROR);
  }

  async enterName(name: string) {
    await this.nameInput.waitForClickable();
    await setInputFieldValue(await this.nameInput, name);
  }

  async enterAddress(address: string) {
    await this.addressInput.waitForClickable();
    await setInputFieldValue(await this.addressInput, address);
  }

  async clearNameFieldValue() {
    await clearInputFieldValue(await this.nameInput);
  }

  async clearAddressFieldValue() {
    await clearInputFieldValue(await this.addressInput);
  }
}

export default new AddressForm();
