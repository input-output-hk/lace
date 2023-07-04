import { Then, When } from '@cucumber/cucumber';
import AddressBookPageAssert from '../assert/addressBook/AddressBookPageAssert';
import AddressBookPage from '../elements/addressbook/AddressBookPage';
import AddressDetailsAssert from '../assert/addressBook/AddressDetailsAssert';
import AddressDetails from '../elements/addressbook/AddressDetails';
import DeleteAddressModal from '../elements/addressbook/DeleteAddressModal';
import DeleteAddressModalAssert from '../assert/addressBook/DeleteAddressModalAssert';

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

Then(
  /^I (see|do not see) address detail page in (extended|popup) mode$/,
  async (shouldSee: 'see' | 'do not see', mode: 'extended' | 'popup') => {
    await AddressDetailsAssert.assertSeeAddressDetailsPage(shouldSee === 'see', mode);
  }
);

When(/^I click "(Copy|Delete|Edit)" button on address details page$/, async (button: 'Copy' | 'Delete' | 'Edit') => {
  switch (button) {
    case 'Copy':
      await AddressDetails.copyButton.waitForClickable();
      await AddressDetails.copyButton.click();
      break;
    case 'Delete':
      await AddressDetails.deleteButton.waitForClickable();
      await AddressDetails.deleteButton.click();
      break;
    case 'Edit':
      await AddressDetails.editButton.waitForClickable();
      await AddressDetails.editButton.click();
      break;
    default:
      throw new Error(`Unsupported button name: ${button}`);
  }
});

Then(/^I (see|do not see) delete address modal$/, async (shouldSee: 'see' | 'do not see') => {
  await DeleteAddressModalAssert.assertSeeDeleteAddressModal(shouldSee === 'see');
});

When(
  /^I click "(Cancel|Delete address)" button on delete address modal$/,
  async (button: 'Cancel' | 'Delete address') => {
    switch (button) {
      case 'Cancel':
        await DeleteAddressModal.cancelButton.waitForClickable();
        await DeleteAddressModal.cancelButton.click();
        break;
      case 'Delete address':
        await DeleteAddressModal.deleteAddressButton.waitForClickable();
        await DeleteAddressModal.deleteAddressButton.click();
        break;
      default:
        throw new Error(`Unsupported button name: ${button}`);
    }
  }
);
