import { Given, Then, When } from '@cucumber/cucumber';
import webTester from '../actor/webTester';
import addressBookAssert from '../assert/addressBook/addressBookAssert';
import addressBookPageObject from '../pageobject/addressBookPageObject';
import { AddressRow } from '../elements/addressbook/extendedview/AddressRow';
import indexedDB from '../fixture/indexedDB';
import popupView from '../page/popupView';
import { FieldNameToCallback, fieldNameToLocator } from '../support/gherkin';
import extendedView from '../page/extendedView';
import addressBookExtendedAssert from '../assert/addressBook/addressBookExtendedAssert';
import addressAddNewPopupAssert from '../assert/addressBook/addressAddNewPopupAssert';
import { getAddressByName, shelley, byron, icarus } from '../data/AddressData';

Given(
  /I don't have any addresses added to my address book in (popup|extended) mode$/,
  {},
  async (mode: 'popup' | 'extended') => {
    await indexedDB.clearAddressBook();
    await browser.pause(500);
    await (mode === 'popup' ? popupView.visitAddressBook() : extendedView.visitAddressBook());
    await addressBookExtendedAssert.assertSeeAddressBookTitle();
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
    await addressBookAssert.assertSeeAddressBookTitle();
  } else {
    await extendedView.visitAddressBook();
  }
});

When(/^I see address book title$/, async () => {
  await addressBookExtendedAssert.assertSeeAddressBookTitle();
});

Given(/I open address book in (popup|extended) mode/, async (mode: 'popup' | 'extended') => {
  if (mode === 'popup') {
    await popupView.visitAddressBook();
    await addressBookAssert.assertSeeAddressBookTitle();
  } else {
    await extendedView.visitAddressBook();
  }
});

When(/^I see address count of: ([\d+])$/, async (expectedNumber: number) => {
  await addressBookAssert.assertSeeAddressCount(expectedNumber);
});

Then(/I see no list entries in the address book/, async () => {
  await addressBookAssert.assertAddressBookEmpty();
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

When(/I click to open add new address form/, async () => {
  await addressBookPageObject.clickAddAddressButton();
  await addressBookAssert.assertAddAddressTitle();
});

Then(/^I see a drawer with the "Add address" form$/, async () => {
  await addressAddNewPopupAssert.assertSeeAddNewAddressForm();
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
      getAddressByName(addressByName),
      expectedShouldSee
    );
  }
);
