import { Then, When } from '@cucumber/cucumber';
import AddressBookPageAssert from '../assert/addressBook/AddressBookPageAssert';
import AddressBookPage from '../elements/addressbook/AddressBookPage';

Then(/^I see address book title$/, async () => {
  await AddressBookPageAssert.assertSeeAddressBookTitle();
});

Then(/^I see address count: ([\d+])$/, async (expectedNumber: number) => {
  await AddressBookPageAssert.assertSeeAddressCount(expectedNumber);
});

When(/^I click "Add address" button on address book page$/, async () => {
  await AddressBookPage.clickAddAddressButton();
});

Then(/^I see empty address book$/, async () => {
  await AddressBookPageAssert.assertAddressBookIsEmpty();
});
