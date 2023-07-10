import AddressForm from '../../elements/addressbook/AddressForm';
import { expect } from 'chai';

class AddressFormAssert {
  assertSeeAddressFormInputs = async () => {
    await AddressForm.nameInput.waitForDisplayed();
    await AddressForm.addressInput.waitForDisplayed();
  };

  assertSeeNameError = async (shouldBeDisplayed: boolean, expectedNameError?: string) => {
    await AddressForm.nameError.waitForDisplayed({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      expect(await AddressForm.nameError.getText()).to.equal(expectedNameError);
    }
  };

  assertSeeAddressError = async (shouldBeDisplayed: boolean, expectedAddressError?: string) => {
    await AddressForm.addressError.waitForDisplayed({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      expect(await AddressForm.addressError.getText()).to.equal(expectedAddressError);
    }
  };

  assertSeeAddressInAddressInput = async (expectedAddress: string) => {
    expect(await AddressForm.addressInput.getValue()).to.equal(expectedAddress);
  };
}

export default new AddressFormAssert();
