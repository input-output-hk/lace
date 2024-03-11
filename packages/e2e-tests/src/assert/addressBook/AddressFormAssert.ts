import AddressForm from '../../elements/addressbook/AddressForm';
import { expect } from 'chai';
import { Address } from '../../data/Address';

class AddressFormAssert {
  assertSeeAddressFormInputs = async () => {
    await AddressForm.nameInput.waitForDisplayed();
    await AddressForm.addressInput.waitForDisplayed();
  };

  assertSeeAddressFormInputsPopulated = async (expectedAddress: Address) => {
    await AddressForm.nameInput.waitForDisplayed();
    expect(await AddressForm.nameInput.getValue()).to.equal(expectedAddress.getName());
    await AddressForm.addressInput.waitForDisplayed();
    expect(await AddressForm.addressInput.getValue()).to.equal(expectedAddress.getAddress());
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

  async assertSeeIconForInvalidAdaHandle(shouldBeDisplayed: boolean) {
    await AddressForm.searchLoader.waitForClickable({ reverse: true, timeout: 5000 });
    await AddressForm.adaHandleIconInvalid.waitForClickable({ reverse: !shouldBeDisplayed });
  }

  async assertSeeIconForValidAdaHandle(shouldBeDisplayed: boolean) {
    await AddressForm.searchLoader.waitForClickable({ reverse: true, timeout: 5000 });
    await AddressForm.adaHandleIconValid.waitForClickable({ reverse: !shouldBeDisplayed });
  }
}

export default new AddressFormAssert();
