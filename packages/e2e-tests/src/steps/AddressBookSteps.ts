import { Then, When } from '@cucumber/cucumber';
import AddressBookPageAssert from '../assert/addressBook/AddressBookPageAssert';
import AddressBookPage from '../elements/addressbook/AddressBookPage';
import AddressDetailsAssert from '../assert/addressBook/AddressDetailsAssert';
import AddressDetails from '../elements/addressbook/AddressDetails';
import DeleteAddressModal from '../elements/addressbook/DeleteAddressModal';
import DeleteAddressModalAssert from '../assert/addressBook/DeleteAddressModalAssert';
import AddNewAddressDrawerAssert from '../assert/addressBook/AddNewAddressDrawerAssert';
import AddNewAddressDrawer from '../elements/addressbook/AddNewAddressDrawer';
import EditAddressDrawer from '../elements/addressbook/EditAddressDrawer';
import EditAddressDrawerAssert from '../assert/addressBook/EditAddressDrawerAssert';
import testContext from '../utils/testContext';
import commonAssert from '../assert/commonAssert';

Then(/^I see address book title$/, async () => {
  await AddressBookPageAssert.assertSeeAddressBookTitle();
});

Then(/^I see address count: ([\d+])$/, async (expectedNumber: number) => {
  await AddressBookPageAssert.assertSeeAddressCount(expectedNumber);
});

When(/^I click "Add address" button on address book page$/, async () => {
  await AddressBookPage.clickAddAddressButton();
});

Then(/^I (see|do not see) "Add address" button on address book page$/, async (shouldSee: 'see' | 'do not see') => {
  await AddressBookPageAssert.assertSeeAddNewAddressButton(shouldSee === 'see');
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
      await testContext.save('address', await AddressDetails.address.getText());
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

Then(/^I see "Add new address" drawer in (extended|popup) mode$/, async (mode: 'extended' | 'popup') => {
  await AddNewAddressDrawerAssert.assertSeeAddNewAddressDrawer(mode);
});

Then(/^I see "Add address" drawer in send flow in (extended|popup) mode$/, async (mode: 'extended' | 'popup') => {
  await AddNewAddressDrawerAssert.assertSeeAddNewAddressDrawer(mode, true);
});

Then(
  /^"Save address" button is (enabled|disabled) on "Add new address" drawer$/,
  async (state: 'enabled' | 'disabled') => {
    await AddNewAddressDrawerAssert.assertSaveAddressButtonEnabled(state === 'enabled');
  }
);

When(
  /^I click "(Save address|Cancel)" button on "Add new address" drawer$/,
  async (button: 'Save address' | 'Cancel') => {
    switch (button) {
      case 'Cancel':
        await AddNewAddressDrawer.clickOnCancelButton();
        break;
      case 'Save address':
        await AddNewAddressDrawer.clickOnSaveAddressButton();
        break;
      default:
        throw new Error(`Unsupported button name: ${button}`);
    }
  }
);

When(/^I click "(Cancel|Done)" button on "Edit address" drawer$/, async (button: 'Cancel' | 'Done') => {
  switch (button) {
    case 'Cancel':
      await EditAddressDrawer.clickOnCancelButton();
      break;
    case 'Done':
      await EditAddressDrawer.clickOnDoneButton();
      break;
    default:
      throw new Error(`Unsupported button name: ${button}`);
  }
});

Then(/^"Done" button is (enabled|disabled) on "Edit address" drawer$/, async (state: 'enabled' | 'disabled') => {
  await EditAddressDrawerAssert.assertDoneButtonEnabled(state === 'enabled');
});

Then(/^address is saved to clipboard$/, async () => {
  const expectedWalletAddress = testContext.load('address') as string;
  await commonAssert.assertClipboardContains(expectedWalletAddress);
});
