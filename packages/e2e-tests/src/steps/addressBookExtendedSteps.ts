import { Then, When } from '@cucumber/cucumber';
import webTester from '../actor/webTester';
import addressBookExtendedAssert from '../assert/addressBook/addressBookExtendedAssert';
import addressAddNewExtendedAssert from '../assert/addressBook/addressAddNewExtendedAssert';
import { AddressRow } from '../elements/addressbook/extendedview/AddressRow';
import addressBookExtendedPageObject from '../pageobject/addressBookExtendedPageObject';
import { FieldNameToCallback, fieldNameToLocator } from '../support/gherkin';
import commonAssert from '../assert/commonAssert';
import AddressDetails from '../elements/addressbook/AddressDetails';
import testContext from '../utils/testContext';
import { getAddressByName, shelley } from '../data/AddressData';
import { browser } from '@wdio/globals';

Then(/address list is displayed and each row consists of:/, async (rows) => {
  const addresses = ['Byron', 'Icarus', 'Shelley'];
  for (const addr of addresses) {
    const testedRow = new AddressRow(addr);
    const fieldsAsserts: FieldNameToCallback[] = [
      ['Avatar', async () => await webTester.seeWebElement(testedRow.avatarElement())],
      ['Name', async () => await webTester.seeWebElement(testedRow.nameElement())],
      ['Address', async () => await testedRow.addressElement.waitForDisplayed()]
    ];
    for (const row of rows.raw()) {
      await fieldNameToLocator(fieldsAsserts, row).then(async (c) => await c());
    }
  }
});

When(/^I click address on the list with name "([^"]*)"$/, async (addressName: string) => {
  const selectedRow = new AddressRow(addressName).addressElement;
  await selectedRow.click();
});

Then(/^I see Add new address form$/, async () => {
  await addressAddNewExtendedAssert.assertSeeAddNewAddressForm();
});

Then(/^I see Add new address form in Send flow$/, async () => {
  await addressAddNewExtendedAssert.assertSeeAddNewAddressFormInSendFlow();
});

Then(
  /^I (see|don't see) address with name "([^"]*)" and address "([^"]*)" on the list$/,
  async (shouldSee: string, name: string, address: string) => {
    if (address === 'shelley') {
      address = shelley.getAddress();
    }
    const expectedShouldSee = shouldSee === 'see';
    await addressBookExtendedAssert.assertSeeAddressOnTheList(name, address, expectedShouldSee);
  }
);

When(
  /I fill ""?([^"]*[^"])""? and ""?([^"]*[^"])""? address details (outside drawer|in drawer)/,
  async (name: string, address: string, target: string) => {
    const inDrawer = target === 'in drawer';
    await addressBookExtendedPageObject.fillNameAndAddress(
      name === 'empty' ? '' : name,
      address === 'empty' ? '' : address,
      inDrawer
    );
    await browser.pause(1000);
  }
);

When(
  /^I fill wallet name: "([^"]*)" and get address by name: "([^"]*)" (outside drawer|in drawer)$/,
  async (name: string, addressByName: string, target: string) => {
    const inDrawer = target === 'in drawer';
    await addressBookExtendedPageObject.fillNameAndAddress(
      name === 'empty' ? '' : name,
      addressByName === 'empty' ? '' : getAddressByName(addressByName),
      inDrawer
    );
    await browser.pause(500);
  }
);

When(/^I fill "([^"]*)" name for address details (outside drawer|in drawer)$/, async (name: string, target: string) => {
  const inDrawer = target === 'in drawer';
  await addressBookExtendedPageObject.fillName(name === 'empty' ? '' : name, inDrawer);
  await browser.pause(1000);
});

When(
  /^I fill "([^"]*)" address field in address book (outside drawer|in drawer)$/,
  async (address: string, target: 'outside drawer' | 'in drawer') => {
    const inDrawer = target === 'in drawer';
    await addressBookExtendedPageObject.fillAddress(address === 'empty' ? '' : address, inDrawer);
    await browser.pause(1000);
  }
);

Then(
  /^Contact name error: "([^"]*)" and address error: "([^"]*)" are displayed$/,
  async (nameError: string, addressError: string) => {
    if (nameError !== 'empty') await webTester.waitUntilSeeElementContainingText(nameError);
    if (addressError !== 'empty') await webTester.waitUntilSeeElementContainingText(addressError);
  }
);

Then(
  /^address input contains address "([^"]*)" and name "([^"]*)"$/,
  async (lastCharsOfAddress: string, addressName: string) => {
    await addressBookExtendedAssert.assertSeeAddressWithNameInAddressInput(lastCharsOfAddress, addressName);
  }
);

Then(/^address input (\d*) is empty$/, async (inputIndex: number) => {
  await addressBookExtendedAssert.assertSeeEmptyAddressInput(inputIndex);
});

When(/^I click on "Copy" button on address detail drawer$/, async () => {
  const address = await AddressDetails.address.getText();
  await testContext.save('address', address);
  await AddressDetails.copyButton.click();
});

Then(/^address is saved to clipboard$/, async () => {
  const expectedWalletAddress = testContext.load('address') as string;
  await commonAssert.assertClipboardContains(expectedWalletAddress);
});

When(
  /^I remove (Name|Address) field content in address book (outside drawer|in drawer)$/,
  async (field: 'name' | 'address', target: string) => {
    const inDrawer = target === 'in drawer';
    await addressBookExtendedPageObject.deleteFieldContent(field, inDrawer);
    await browser.pause(1000);
  }
);

When(/^I click on address book background to lose focus (outside drawer|in drawer)$/, async (target: string) => {
  const inDrawer = target === 'in drawer';
  await addressBookExtendedPageObject.clickToLoseFocus(inDrawer);
  await browser.pause(1000);
});
