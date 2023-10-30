import { Then, When } from '@cucumber/cucumber';
import AddressForm from '../elements/addressbook/AddressForm';
import { browser } from '@wdio/globals';
import { byron, getAddressByName, icarus, shelley } from '../data/AddressData';
import { t } from '../utils/translationService';
import AddressFormAssert from '../assert/addressBook/AddressFormAssert';
import CommonDrawerElements from '../elements/CommonDrawerElements';

When(
  /^I fill address form with ""?([^"]*[^"])""? name and ""?([^"]*[^"])""? address$/,
  async (name: string, address: string) => {
    await AddressForm.enterName(name === 'empty' ? '' : name);
    await AddressForm.enterAddress(address === 'empty' ? '' : address);
    await browser.pause(500); // Wait for input field value validation
  }
);

When(
  /^I fill address form with ""?([^"]*[^"])""? name and address from ""?([^"]*[^"])""? address$/,
  async (name: string, addressByName: string) => {
    await AddressForm.enterName(name === 'empty' ? '' : name);
    await AddressForm.enterAddress(addressByName === 'empty' ? '' : String(getAddressByName(addressByName)));
    await browser.pause(500); // Wait for input field value validation
  }
);

When(/^I fill address form with ""?([^"]*[^"])""? name$/, async (name: string) => {
  await AddressForm.enterName(name === 'empty' ? '' : name);
  await browser.pause(500); // Wait for input field value validation
});

When(
  /^I fill address form with ""?([^"]*[^"])""? (address|ADA handle)$/,
  // eslint-disable-next-line no-unused-vars,@typescript-eslint/no-unused-vars
  async (address: string, _addressOrADAHandle: string) => {
    await AddressForm.enterAddress(address === 'empty' ? '' : address);
    await browser.pause(500); // Wait for input field value validation
  }
);

Then(
  /^Contact "([^"]*)" name error and "([^"]*)" address error are displayed$/,
  async (nameError: string, addressError: string) => {
    await AddressFormAssert.assertSeeNameError(nameError !== 'empty', nameError);
    await AddressFormAssert.assertSeeAddressError(addressError !== 'empty', addressError);
  }
);

Then(/^address form is filled with "([^"]*)" address$/, async (address: string) => {
  let expectedAddress;
  switch (address) {
    case 'shelley':
      expectedAddress = shelley.getAddress();
      break;
    case 'byron':
      expectedAddress = byron.getAddress();
      break;
    case 'icarus':
      expectedAddress = icarus.getAddress();
      break;
    default:
      expectedAddress = address;
  }

  await AddressFormAssert.assertSeeAddressInAddressInput(expectedAddress);
});

When(/^I clear (address|name) field value in address form$/, async (field: 'address' | 'name') => {
  switch (field) {
    case 'address':
      await AddressForm.clearAddressFieldValue();
      break;
    case 'name':
      await AddressForm.clearNameFieldValue();
      break;
    default:
      throw new Error(`Unsupported field name: ${field}`);
  }
});

When(/^I click outside address form to lose focus$/, async () => {
  await new CommonDrawerElements().drawerHeaderTitle.click();
});

Then(/^Red "X" icon is displayed next to ADA handle$/, async () => {
  await AddressFormAssert.assertSeeIconForInvalidAdaHandle(true);
});

Then(/^Green tick icon is displayed next to ADA handle$/, async () => {
  await AddressFormAssert.assertSeeIconForValidAdaHandle(true);
});

Then(/^"Handle not found" error is displayed in address book form$/, async () => {
  await AddressFormAssert.assertSeeAddressError(true, await t('general.errors.incorrectHandle'));
});
