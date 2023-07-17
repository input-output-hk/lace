import { Given, Then, When } from '@cucumber/cucumber';
import webTester from '../actor/webTester';
import addressBookAssert from '../assert/addressBook/addressBookAssert';
import { AddressRow } from '../elements/addressbook/extendedview/AddressRow';
import indexedDB from '../fixture/indexedDB';
import popupView from '../page/popupView';
import { FieldNameToCallback, fieldNameToLocator } from '../support/gherkin';
import extendedView from '../page/extendedView';
import { getAddressByName, shelley, byron, icarus } from '../data/AddressData';
import AddressBookPageAssert from '../assert/addressBook/AddressBookPageAssert';

Given(
  /I don't have any addresses added to my address book in (popup|extended) mode$/,
  {},
  async (mode: 'popup' | 'extended') => {
    await indexedDB.clearAddressBook();
    await browser.pause(500);
    await (mode === 'popup' ? popupView.visitAddressBook() : extendedView.visitAddressBook());
    await AddressBookPageAssert.assertSeeAddressBookTitle();
  }
);

Given(/I have 3 addresses in my address book in (popup|extended) mode/, async (mode: 'popup' | 'extended') => {
  await indexedDB.clearAddressBook();
  await indexedDB.insertAddress(shelley);
  await indexedDB.insertAddress(byron);
  await indexedDB.insertAddress(icarus);
  await browser.pause(500);
  if (mode === 'popup') {
    await popupView.visitAddressBook();
    await AddressBookPageAssert.assertSeeAddressBookTitle();
  } else {
    await extendedView.visitAddressBook();
  }
});

Given(/I open address book in (popup|extended) mode/, async (mode: 'popup' | 'extended') => {
  if (mode === 'popup') {
    await popupView.visitAddressBook();
    await AddressBookPageAssert.assertSeeAddressBookTitle();
  } else {
    await extendedView.visitAddressBook();
  }
});

Then(/address list displays and each row consists of:/, async (rows) => {
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

When(/^I click address list item with name "([^"]*)"$/, async (addressName: string) => {
  const selectedRow = new AddressRow(addressName);
  await webTester.clickElement(selectedRow.nameElement());
});

Then(
  /^I (see|don't see) address that has name "([^"]*)" and address "([^"]*)" on the list$/,
  async (shouldSee: string, name: string, address: string) => {
    const expectedShouldSee = shouldSee === 'see';
    await addressBookAssert.assertSeeAddressOnTheList(name, address, expectedShouldSee);
  }
);

Then(
  /^I (see|don't see) address that has name "([^"]*)" and shortened address "([^"]*)" on the list$/,
  async (shouldSee: string, name: string, addressByName: string) => {
    const expectedShouldSee = shouldSee === 'see';
    await addressBookAssert.assertSeeShortenedAddressOnTheList(
      name,
      String(getAddressByName(addressByName)),
      expectedShouldSee
    );
  }
);
